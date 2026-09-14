begin;
create table public.eme_profiles (
 id uuid primary key references auth.users(id), name text not null, email text not null unique,
 role text not null check(role in ('admin','corretor')), active boolean not null default true,
 must_change boolean not null default false, created_at timestamptz not null default now()
);
create table public.eme_sessions (
 token_hash text primary key, user_id uuid not null references public.eme_profiles(id),
 expires_at timestamptz not null, last_seen timestamptz not null default now()
);
create table public.eme_cases (
 id uuid primary key, assignee_id uuid not null references public.eme_profiles(id), version bigint not null default 1,
 data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<150000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index eme_cases_assignee on public.eme_cases(assignee_id);
create table public.eme_audit (
 id bigint generated always as identity primary key, case_id uuid references public.eme_cases(id),
 actor_id uuid not null references public.eme_profiles(id), action text not null, detail text not null,
 created_at timestamptz not null default now()
);
create index eme_audit_case on public.eme_audit(case_id,id desc);
create table public.eme_limits (key text primary key, count integer not null, until_at timestamptz not null);
alter table public.eme_profiles enable row level security;
alter table public.eme_sessions enable row level security;
alter table public.eme_cases enable row level security;
alter table public.eme_audit enable row level security;
alter table public.eme_limits enable row level security;
revoke all on public.eme_profiles, public.eme_sessions, public.eme_cases, public.eme_audit, public.eme_limits from anon,authenticated;
grant all on public.eme_profiles, public.eme_sessions, public.eme_cases, public.eme_audit, public.eme_limits to service_role;
grant usage,select on sequence public.eme_audit_id_seq to service_role;

create function public.eme_limit(p_key text,p_max integer) returns void language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 delete from public.eme_limits where until_at<now();
 insert into public.eme_limits values(p_key,1,now()+interval '15 minutes') on conflict(key) do update set count=public.eme_limits.count+1 returning count into n;
 if n>p_max then raise exception 'RATE_LIMIT'; end if;
end $$;

create function public.eme_save_case(p_session text,p_id uuid,p_version bigint,p_data jsonb,p_assignee uuid,p_action text,p_detail text)
returns public.eme_cases language plpgsql security invoker set search_path='' as $$
declare actor public.eme_profiles; old public.eme_cases; result public.eme_cases;
begin
 select p.* into actor from public.eme_profiles p join public.eme_sessions s on s.user_id=p.id
 where s.token_hash=p_session and p.active and not p.must_change and s.expires_at>now() and s.last_seen>now()-interval '30 minutes' for share of p,s;
 if actor.id is null then raise exception 'UNAUTHORIZED'; end if;
 if not exists(select 1 from public.eme_profiles where id=p_assignee and active) then raise exception 'ASSIGNEE'; end if;
 select * into old from public.eme_cases where id=p_id for update;
 if old.id is null then
   if p_version<>0 or (actor.role<>'admin' and actor.id<>p_assignee) then raise exception 'FORBIDDEN'; end if;
   insert into public.eme_cases(id,assignee_id,data) values(p_id,p_assignee,p_data) returning * into result;
 else
   if old.version<>p_version then raise exception 'STALE_VERSION'; end if;
   if actor.role<>'admin' and (old.assignee_id<>actor.id or p_assignee<>actor.id or old.data->>'stage' in ('Entrada aprovada','Não selecionado') or p_data->>'stage' in ('Entrada aprovada','Não selecionado') or coalesce(p_data->'published','null'::jsonb)<>'null'::jsonb) then raise exception 'FORBIDDEN'; end if;
   update public.eme_cases set data=p_data,assignee_id=p_assignee,version=version+1,updated_at=now() where id=p_id returning * into result;
 end if;
 insert into public.eme_audit(case_id,actor_id,action,detail) values(p_id,actor.id,p_action,p_detail);
 return result;
end $$;

create function public.eme_bootstrap(p_id uuid,p_name text,p_email text) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(7061801);
 if exists(select 1 from public.eme_profiles) then raise exception 'ALREADY_CONFIGURED'; end if;
 insert into public.eme_profiles(id,name,email,role) values(p_id,p_name,p_email,'admin');
 insert into public.eme_audit(actor_id,action,detail) values(p_id,'Administrador inicial ativado','Ativação protegida concluída.');
end $$;

create function public.eme_set_active(p_session text,p_id uuid,p_active boolean) returns void language plpgsql security invoker set search_path='' as $$
declare actor uuid; member public.eme_profiles;
begin
 perform pg_advisory_xact_lock(7061802);
 select p.id into actor from public.eme_profiles p join public.eme_sessions s on p.id=s.user_id where s.token_hash=p_session and p.active and not p.must_change and p.role='admin' and s.expires_at>now() and s.last_seen>now()-interval '30 minutes';
 if actor is null or actor=p_id then raise exception 'FORBIDDEN'; end if;
 select * into member from public.eme_profiles where id=p_id for update;
 if member.id is null then raise exception 'NOT_FOUND'; end if;
 if not p_active and member.role='admin' and (select count(*) from public.eme_profiles where active and role='admin')<=1 then raise exception 'LAST_ADMIN'; end if;
 update public.eme_profiles set active=p_active where id=p_id;
 if not p_active then delete from public.eme_sessions where user_id=p_id; end if;
 insert into public.eme_audit(actor_id,action,detail) values(actor,'Acesso da equipe atualizado',member.name||': ativo='||p_active);
end $$;

create function public.eme_add_member(p_session text,p_id uuid,p_name text,p_email text,p_role text) returns void language plpgsql security invoker set search_path='' as $$
declare actor uuid;
begin
 select p.id into actor from public.eme_profiles p join public.eme_sessions s on p.id=s.user_id where s.token_hash=p_session and p.active and not p.must_change and p.role='admin' and s.expires_at>now() and s.last_seen>now()-interval '30 minutes' for share of p,s;
 if actor is null then raise exception 'FORBIDDEN'; end if;
 insert into public.eme_profiles(id,name,email,role,must_change) values(p_id,p_name,p_email,p_role,true);
 insert into public.eme_audit(actor_id,action,detail) values(actor,'Pessoa adicionada à equipe',p_name||' · '||p_role);
end $$;
revoke all on function public.eme_add_member(text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.eme_add_member(text,uuid,text,text,text) to service_role;
revoke all on function public.eme_limit(text,integer),public.eme_save_case(text,uuid,bigint,jsonb,uuid,text,text),public.eme_bootstrap(uuid,text,text),public.eme_set_active(text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.eme_limit(text,integer),public.eme_save_case(text,uuid,bigint,jsonb,uuid,text,text),public.eme_bootstrap(uuid,text,text),public.eme_set_active(text,uuid,boolean) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('eme-property-photos','eme-property-photos',false,3145728,array['image/webp']) on conflict(id) do nothing;
notify pgrst,'reload schema';
commit;
