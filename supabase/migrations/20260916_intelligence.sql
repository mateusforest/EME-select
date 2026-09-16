begin;
create table public.eme_ai_settings (
 id text primary key check(id='company'),version bigint not null default 0,
 model text not null default 'gpt-5-mini',enabled boolean not null default false,secret text not null default ''
);
create table public.eme_ai_runs (
 id uuid primary key,case_id uuid not null references public.eme_cases(id),
 actor_id uuid not null references public.eme_profiles(id),case_version bigint not null,
 status text not null check(status in ('processing','completed','failed')),
 data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<100000),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 review_version bigint not null default 0
);
create index eme_ai_runs_case on public.eme_ai_runs(case_id,created_at desc);
create table public.eme_ai_audit (
 id bigint generated always as identity primary key,actor_id uuid not null references public.eme_profiles(id),
 action text not null,run_id uuid references public.eme_ai_runs(id),created_at timestamptz not null default now()
);
alter table public.eme_ai_settings enable row level security;
alter table public.eme_ai_runs enable row level security;
alter table public.eme_ai_audit enable row level security;
revoke all on public.eme_ai_settings,public.eme_ai_runs,public.eme_ai_audit from public,anon,authenticated,service_role;
grant select,update on public.eme_ai_settings to service_role;
grant select,insert,update on public.eme_ai_runs to service_role;
grant select,insert on public.eme_ai_audit to service_role;
revoke all on sequence public.eme_ai_audit_id_seq from public,anon,authenticated,service_role;
grant usage,select on sequence public.eme_ai_audit_id_seq to service_role;
insert into public.eme_ai_settings(id) values('company');

create function public.eme_ai_write(p_session text,p_action text,p_data jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor public.eme_profiles; prop public.eme_cases; run public.eme_ai_runs; cfg public.eme_ai_settings;
 requested_id uuid; inserted_count int; review jsonb;
begin
 select p.* into actor from public.eme_profiles p join public.eme_sessions s on s.user_id=p.id
 where s.token_hash=p_session and p.active and not p.must_change and s.expires_at>now() and s.last_seen>now()-interval '30 minutes' for share of p,s;
 if actor.id is null then raise exception 'UNAUTHORIZED'; end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>90000 then raise exception 'INVALID_AI_DATA'; end if;
 if p_action='settings' then
   if actor.role<>'admin' then raise exception 'FORBIDDEN'; end if;
   select * into cfg from public.eme_ai_settings where id='company' for update;
   if cfg.version is distinct from (p_data->>'version')::bigint then raise exception 'STALE_VERSION'; end if;
   if coalesce(p_data->>'model','')!~'^[a-zA-Z0-9._:-]{3,100}$' or jsonb_typeof(p_data->'enabled') is distinct from 'boolean'
     or jsonb_typeof(p_data->'secret') is distinct from 'string' or length(p_data->>'secret')>1200 then raise exception 'INVALID_AI_SETTINGS'; end if;
   update public.eme_ai_settings set model=p_data->>'model',enabled=(p_data->>'enabled')::boolean,secret=p_data->>'secret',version=version+1 where id='company';
   insert into public.eme_ai_audit(actor_id,action) values(actor.id,'Configuração da IA atualizada');
   return jsonb_build_object('ok',true);
 end if;
 requested_id:=(p_data->>'id')::uuid;
 if p_action='begin' then
   select * into prop from public.eme_cases where id=(p_data->>'caseId')::uuid for share;
   if prop.id is null or (actor.role<>'admin' and prop.assignee_id<>actor.id) then raise exception 'FORBIDDEN'; end if;
   if prop.version is distinct from (p_data->>'caseVersion')::bigint then raise exception 'STALE_VERSION'; end if;
   if p_data->>'task' is null or p_data->>'task' not in ('checklist','curadoria','atendimento','locacao','documentos')
     or coalesce(p_data->>'fingerprint','')!~'^[a-f0-9]{64}$' then raise exception 'INVALID_AI_TASK'; end if;
   insert into public.eme_ai_runs(id,case_id,actor_id,case_version,status,data)
     values(requested_id,prop.id,actor.id,prop.version,'processing',p_data||jsonb_build_object('actorName',actor.name,'review',null)) on conflict(id) do nothing;
   get diagnostics inserted_count=row_count;
   if inserted_count=1 then insert into public.eme_ai_audit(actor_id,action,run_id) values(actor.id,'Análise iniciada',requested_id); end if;
   return jsonb_build_object('inserted',inserted_count=1);
 end if;
 select * into run from public.eme_ai_runs where id=requested_id for update;
 if run.id is null then raise exception 'FORBIDDEN'; end if;
 select * into prop from public.eme_cases where id=run.case_id for share;
 if actor.role<>'admin' and prop.assignee_id<>actor.id then raise exception 'FORBIDDEN'; end if;
 if p_action='finish' then
   if run.actor_id<>actor.id then raise exception 'FORBIDDEN'; end if;
   if run.status<>'processing' then raise exception 'STALE_VERSION'; end if;
   if p_data->>'status' is null or p_data->>'status' not in ('completed','failed') then raise exception 'INVALID_AI_STATUS'; end if;
   update public.eme_ai_runs set status=p_data->>'status',data=data||(p_data-'id')||jsonb_build_object('stale',prop.version<>run.case_version),updated_at=now() where id=requested_id;
   insert into public.eme_ai_audit(actor_id,action,run_id) values(actor.id,case when p_data->>'status'='completed' then 'Análise concluída para revisão humana' else 'Falha na análise' end,requested_id);
 elsif p_action='abandon' then
   if actor.role<>'admin' then raise exception 'FORBIDDEN'; end if;
   if run.status<>'processing' or run.created_at>now()-interval '5 minutes' then raise exception 'STALE_VERSION'; end if;
   update public.eme_ai_runs set status='failed',data=data||jsonb_build_object('error','Processamento interrompido. Nova solicitação requer ação da equipe.','abandonedBy',actor.name,'abandonedAt',now()),updated_at=now() where id=requested_id;
   insert into public.eme_ai_audit(actor_id,action,run_id) values(actor.id,'Processamento interrompido encerrado pelo administrador',requested_id);
 elsif p_action='review' then
   if actor.role<>'admin' then raise exception 'FORBIDDEN'; end if;
   if run.status<>'completed' or run.review_version is distinct from (p_data->>'version')::bigint then raise exception 'STALE_VERSION'; end if;
   if p_data->>'status' is null or p_data->>'status' not in ('accepted','discarded') or coalesce(length(p_data->>'note'),0) not between 10 and 2000 then raise exception 'INVALID_AI_REVIEW'; end if;
   if p_data->>'status'='accepted' and prop.version<>run.case_version then raise exception 'STALE_VERSION'; end if;
   review:=jsonb_build_object('status',p_data->>'status','note',p_data->>'note','author',actor.name,'at',now());
   update public.eme_ai_runs set data=data||jsonb_build_object('review',review,'reviews',coalesce(data->'reviews','[]'::jsonb)||jsonb_build_array(review)),updated_at=now(),review_version=review_version+1 where id=requested_id;
   insert into public.eme_ai_audit(actor_id,action,run_id) values(actor.id,'Recomendação '||(p_data->>'status'),requested_id);
 else raise exception 'INVALID_AI_ACTION'; end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.eme_ai_write(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.eme_ai_write(text,text,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
