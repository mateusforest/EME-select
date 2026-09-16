-- EME SELECT · 0.14.0
-- Executar no SQL Editor do projeto vjoajqrwqdeujqaognac (EME).
-- Cria 7 tabelas privadas e 2 funções. Não altera imóveis nem financeiro.
-- Sem tokens, senhas, chaves ou dados de exemplo neste arquivo.
-- Uma única transação: qualquer erro cancela a ativação inteira.
begin;
do $$ begin
  if to_regclass('public.eme_profiles') is null
    or to_regclass('public.eme_cases') is null
    or to_regclass('public.eme_finance_state') is null then
    raise exception 'Base EME não identificada. Confira o projeto antes de continuar.';
  end if;
end $$;

-- 20260916_operations.sql
create table public.eme_operations_state(
 id text primary key check(id='company'),version bigint not null default 0 check(version>=0),
 data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<3000000),updated_at timestamptz not null default now()
);
create table public.eme_operations_audit(
 id bigint generated always as identity primary key,actor_id uuid not null references public.eme_profiles(id),
 property_id uuid references public.eme_cases(id),action text not null,command jsonb not null,
 state_version bigint not null,before_hash text not null,after_hash text not null,created_at timestamptz not null default now()
);
create table public.eme_operations_receipts(
 request_id uuid primary key,payload_hash text not null,command jsonb not null,state_version bigint not null,
 actor_id uuid not null references public.eme_profiles(id),property_id uuid references public.eme_cases(id),created_at timestamptz not null default now()
);
create table public.eme_operations_files(
 id uuid primary key,property_id uuid not null references public.eme_cases(id),filename text not null,
 mime_type text not null check(mime_type in('application/pdf','image/png','image/jpeg','image/webp')),
 size_bytes integer not null check(size_bytes between 1 and 2097152),sha256 text not null check(sha256~'^[a-f0-9]{64}$'),
 content_base64 text not null check(length(content_base64)<=2796204),created_by uuid not null references public.eme_profiles(id),created_at timestamptz not null default now()
);
alter table public.eme_operations_state enable row level security;
alter table public.eme_operations_audit enable row level security;
alter table public.eme_operations_receipts enable row level security;
alter table public.eme_operations_files enable row level security;
revoke all on public.eme_operations_state,public.eme_operations_audit,public.eme_operations_receipts,public.eme_operations_files from public,anon,authenticated,service_role;
grant select,update on public.eme_operations_state to service_role;
grant select,insert on public.eme_operations_audit,public.eme_operations_receipts,public.eme_operations_files to service_role;
revoke all on sequence public.eme_operations_audit_id_seq from public,anon,authenticated,service_role;
grant usage,select on sequence public.eme_operations_audit_id_seq to service_role;
insert into public.eme_operations_state(id,data) values('company','{"version":1,"tickets":[],"visits":[],"leases":[],"documents":[],"reviews":[]}'::jsonb);

create function public.eme_save_operations(
 p_session text,p_version bigint,p_request_id uuid,p_payload_hash text,p_command jsonb,p_data jsonb,
 p_property_id uuid,p_file jsonb,p_before_hash text,p_after_hash text
) returns public.eme_operations_state language plpgsql security invoker set search_path='' as $$
declare
 actor public.eme_profiles; current_state public.eme_operations_state; result public.eme_operations_state;
 receipt public.eme_operations_receipts; case_row public.eme_cases;
 action text; collection text; field text; candidate jsonb; previous jsonb; target jsonb; old_target jsonb;
 changed_count integer:=0; seen_ids text[]; previous_key jsonb; next_key jsonb;
begin
 select p.* into actor from public.eme_profiles p join public.eme_sessions s on s.user_id=p.id
 where s.token_hash=p_session and p.active and not p.must_change and s.expires_at>now()
 and s.last_seen>now()-interval '30 minutes' for share of p,s;
 if actor.id is null then raise exception 'UNAUTHORIZED'; end if;
 if actor.role not in('admin','corretor') then raise exception 'FORBIDDEN'; end if;
 action:=p_command->>'type';
 if action not in('ticket.save','ticket.message','visit.save','visit.confirm','visit.cancel','visit.complete','key.request','key.authorize','key.pickup','key.return','lease.save','lease.end','lease.generate','lease.receive','lease.repass','lease.cancel_charge','lease.maintenance','lease.inspection','document.upload','document.review','review.save') then raise exception 'OPERATIONS_INVALID_COMMAND'; end if;
 if actor.role<>'admin' and action in('visit.confirm','key.authorize','lease.end','lease.cancel_charge','document.review','review.save') then raise exception 'FORBIDDEN'; end if;
 -- Hold the live assignment while validating and committing. A reassignment waits
 -- for this transaction, and subsequent reads/downloads check it again.
 if action='review.save' then
  if p_property_id is not null then raise exception 'OPERATIONS_INVALID_SCOPE'; end if;
 else
  select * into case_row from public.eme_cases where id=p_property_id for share;
  if case_row.id is null or(actor.role<>'admin' and case_row.assignee_id is distinct from actor.id) then raise exception 'FORBIDDEN'; end if;
 end if;
 select * into current_state from public.eme_operations_state where id='company' for update;
 if current_state.id is null then raise exception 'OPERATIONS_NOT_READY'; end if;
 select * into receipt from public.eme_operations_receipts where request_id=p_request_id;
 if receipt.request_id is not null then
  if receipt.actor_id<>actor.id or receipt.payload_hash is distinct from p_payload_hash or receipt.command is distinct from p_command or receipt.property_id is distinct from p_property_id then raise exception 'OPERATIONS_REQUEST_REUSED' using errcode='23505'; end if;
  return current_state;
 end if;
 if p_version is null or p_version<0 or current_state.version<>p_version then raise exception 'STALE_VERSION'; end if;
 if p_request_id is null or p_payload_hash is null or p_payload_hash!~'^[a-f0-9]{64}$'
 or p_before_hash is null or p_before_hash!~'^[a-f0-9]{64}$' or p_after_hash is null or p_after_hash!~'^[a-f0-9]{64}$'
 or p_command is null or jsonb_typeof(p_command)<>'object' or jsonb_typeof(p_command->'data') is distinct from 'object' or octet_length(p_command::text)>30000 or p_command->'data'?'contentBase64'
 or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>=3000000 or p_data->>'version' is distinct from '1'
 or (select count(*) from jsonb_object_keys(p_data))<>6
 then raise exception 'OPERATIONS_INVALID_STATE'; end if;
 collection:=case split_part(action,'.',1) when 'ticket' then 'tickets' when 'visit' then 'visits' when 'key' then 'visits' when 'lease' then 'leases' when 'document' then 'documents' when 'review' then 'reviews' end;
 foreach field in array array['tickets','visits','leases','documents','reviews'] loop
  if jsonb_typeof(p_data->field) is distinct from 'array' then raise exception 'OPERATIONS_INVALID_STATE'; end if;
  if field<>collection and p_data->field is distinct from current_state.data->field then raise exception 'FORBIDDEN'; end if;
  seen_ids:=array[]::text[];
  for candidate in select value from jsonb_array_elements(p_data->field) loop
   if jsonb_typeof(candidate)<>'object' or coalesce(candidate->>'id','')!~'^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' or candidate->>'id'=any(seen_ids) then raise exception 'OPERATIONS_INVALID_STATE'; end if;
   seen_ids:=array_append(seen_ids,candidate->>'id');
   select value into previous from jsonb_array_elements(current_state.data->field) where value->>'id'=candidate->>'id';
   if candidate is distinct from previous then
    changed_count:=changed_count+1;target:=candidate;old_target:=previous;
    if field<>collection or(field<>'reviews' and candidate->>'propertyId' is distinct from p_property_id::text) then raise exception 'FORBIDDEN'; end if;
    if previous is not null and (previous->>'propertyId' is distinct from candidate->>'propertyId' or previous->>'createdBy' is distinct from candidate->>'createdBy' or previous->>'createdAt' is distinct from candidate->>'createdAt') then raise exception 'FORBIDDEN'; end if;
    if previous is null and candidate->>'createdBy' is distinct from actor.id::text then raise exception 'FORBIDDEN'; end if;
    if p_command->'data'->>'id' is not null and candidate->>'id' is distinct from p_command->'data'->>'id' then raise exception 'FORBIDDEN'; end if;
   end if;
  end loop;
  for previous in select value from jsonb_array_elements(current_state.data->field) loop
   if not(previous->>'id'=any(seen_ids)) then raise exception 'OPERATIONS_HISTORY_IMMUTABLE'; end if;
  end loop;
 end loop;
 if changed_count>1 then raise exception 'FORBIDDEN'; end if;
 -- Saving an unchanged form and repeating a generated competence are valid
 -- no-ops. The receipt still records the command once, without fabricating rows.
 if collection='tickets' and changed_count=1 then
  if action='ticket.save' and coalesce(old_target->'messages','[]'::jsonb) is distinct from target->'messages' then raise exception 'OPERATIONS_HISTORY_IMMUTABLE'; end if;
  if action='ticket.message' then
   if old_target is null or(target-array['messages','updatedAt']) is distinct from(old_target-array['messages','updatedAt'])
   or jsonb_array_length(target->'messages')<>jsonb_array_length(old_target->'messages')+1
   or(target->'messages'->-1->>'createdBy') is distinct from actor.id::text
   then raise exception 'FORBIDDEN'; end if;
   for previous in select value from jsonb_array_elements(old_target->'messages') with ordinality as e(value,position) loop
    if not exists(select 1 from jsonb_array_elements(target->'messages') m where m=previous) then raise exception 'OPERATIONS_HISTORY_IMMUTABLE'; end if;
   end loop;
   if (select jsonb_agg(value order by position) from jsonb_array_elements(target->'messages') with ordinality as e(value,position) where position<=jsonb_array_length(old_target->'messages')) is distinct from nullif(old_target->'messages','[]'::jsonb) then raise exception 'OPERATIONS_HISTORY_IMMUTABLE'; end if;
  end if;
 end if;
 if collection='visits' and changed_count=1 then
  previous_key:=coalesce(old_target->'key','{}'::jsonb);next_key:=target->'key';
  if actor.role<>'admin' then
   if action='visit.save' and (previous_key->>'status' in('out','returned') or target->>'status'<>'requested' or next_key->>'status'<>'none' or next_key->>'authorizedBy' is not null or next_key->>'authorizedAt' is not null or next_key->>'pickedUpAt' is not null or next_key->>'returnedAt' is not null) then raise exception 'FORBIDDEN'; end if;
   if action<>'visit.save' and (target-array['key','status','notes','cancelReason','updatedAt']) is distinct from (old_target-array['key','status','notes','cancelReason','updatedAt']) then raise exception 'FORBIDDEN'; end if;
   if action in('visit.cancel','visit.complete') and (previous_key->>'status'='out' or next_key is distinct from previous_key) then raise exception 'FORBIDDEN'; end if;
   if action='visit.cancel' and target->>'status'<>'cancelled' then raise exception 'FORBIDDEN'; end if;
   if action='visit.complete' and (old_target->>'status'<>'confirmed' or target->>'status'<>'completed') then raise exception 'FORBIDDEN'; end if;
   if action='key.request' and (previous_key->>'status' not in('none','requested') or next_key->>'status'<>'requested' or (next_key-'status') is distinct from(previous_key-'status')) then raise exception 'FORBIDDEN'; end if;
   if action in('key.pickup','key.return') then
    if next_key->>'authorizedBy' is distinct from previous_key->>'authorizedBy' or next_key->>'authorizedAt' is distinct from previous_key->>'authorizedAt' or next_key->>'returnDueAt' is distinct from previous_key->>'returnDueAt' or target->>'status' is distinct from old_target->>'status' then raise exception 'FORBIDDEN'; end if;
    if action='key.pickup' and (old_target->>'status'<>'confirmed' or previous_key->>'status'<>'authorized' or next_key->>'status'<>'out') then raise exception 'FORBIDDEN'; end if;
    if action='key.return' and (previous_key->>'status'<>'out' or next_key->>'status'<>'returned' or next_key->>'pickedUpAt' is distinct from previous_key->>'pickedUpAt' or next_key->>'custodianName' is distinct from previous_key->>'custodianName' or next_key->>'identityReference' is distinct from previous_key->>'identityReference') then raise exception 'FORBIDDEN'; end if;
   end if;
  end if;
  if action='visit.save' and exists(select 1 from jsonb_array_elements(current_state.data->'visits') v where v->>'id'<>target->>'id' and v->>'status' in('requested','confirmed') and (v->>'propertyId'=target->>'propertyId' or v->>'brokerId'=target->>'brokerId') and (v->>'startAt')::timestamptz<(target->>'endAt')::timestamptz and (v->>'endAt')::timestamptz>(target->>'startAt')::timestamptz) then raise exception 'OPERATIONS_SCHEDULE_CONFLICT' using errcode='23505'; end if;
 end if;
 if collection='leases' and actor.role<>'admin' and changed_count=1 then
  if action='lease.save' and(target->>'status'<>'active' or coalesce(old_target->'charges','[]'::jsonb) is distinct from target->'charges' or coalesce(old_target->'maintenance','[]'::jsonb) is distinct from target->'maintenance' or coalesce(old_target->'inspections','[]'::jsonb) is distinct from target->'inspections') then raise exception 'FORBIDDEN'; end if;
  if action<>'lease.save' and (target-array['charges','maintenance','inspections','updatedAt']) is distinct from(old_target-array['charges','maintenance','inspections','updatedAt']) then raise exception 'FORBIDDEN'; end if;
  if action in('lease.generate','lease.receive','lease.repass') and(target->'maintenance' is distinct from old_target->'maintenance' or target->'inspections' is distinct from old_target->'inspections') then raise exception 'FORBIDDEN'; end if;
  if action='lease.maintenance' and(target->'charges' is distinct from old_target->'charges' or target->'inspections' is distinct from old_target->'inspections') then raise exception 'FORBIDDEN'; end if;
  if action='lease.inspection' and(target->'charges' is distinct from old_target->'charges' or target->'maintenance' is distinct from old_target->'maintenance') then raise exception 'FORBIDDEN'; end if;
 end if;
 if action='document.upload' then
  if p_file is null or old_target is not null or target->>'status'<>'pending' or target->>'reviewedBy' is not null or target->>'reviewedAt' is not null
  or p_file->>'id' is distinct from target->>'id' or p_file->>'propertyId' is distinct from p_property_id::text
  or p_file->>'sha256' is distinct from target->>'sha256' or p_file->>'mimeType' is distinct from target->>'mimeType'
  or p_file->>'filename' is distinct from target->>'filename' or p_file->>'sizeBytes' is distinct from target->>'sizeBytes'
  or octet_length(decode(p_file->>'contentBase64','base64'))<>(p_file->>'sizeBytes')::integer
  or encode(sha256(decode(p_file->>'contentBase64','base64')),'hex') is distinct from p_file->>'sha256'
  then raise exception 'OPERATIONS_INVALID_FILE'; end if;
  insert into public.eme_operations_files(id,property_id,filename,mime_type,size_bytes,sha256,content_base64,created_by)
  values((p_file->>'id')::uuid,p_property_id,p_file->>'filename',p_file->>'mimeType',(p_file->>'sizeBytes')::integer,p_file->>'sha256',p_file->>'contentBase64',actor.id);
 elsif p_file is not null then raise exception 'OPERATIONS_INVALID_FILE'; end if;
 update public.eme_operations_state set data=p_data,version=version+1,updated_at=now() where id='company' returning * into result;
 insert into public.eme_operations_audit(actor_id,property_id,action,command,state_version,before_hash,after_hash) values(actor.id,p_property_id,action,p_command,result.version,p_before_hash,p_after_hash);
 insert into public.eme_operations_receipts(request_id,payload_hash,command,state_version,actor_id,property_id) values(p_request_id,p_payload_hash,p_command,result.version,actor.id,p_property_id);
 return result;
end $$;
revoke all on function public.eme_save_operations(text,bigint,uuid,text,jsonb,jsonb,uuid,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.eme_save_operations(text,bigint,uuid,text,jsonb,jsonb,uuid,jsonb,text,text) to service_role;
notify pgrst,'reload schema';

-- 20260916_intelligence.sql
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

-- Conferência da ativação: as 7 tabelas devem aparecer com RLS = true.
select relname as tabela, relrowsecurity as rls from pg_class
where relnamespace='public'::regnamespace and relname in
('eme_operations_state','eme_operations_audit','eme_operations_receipts','eme_operations_files',
 'eme_ai_settings','eme_ai_runs','eme_ai_audit') order by relname;
