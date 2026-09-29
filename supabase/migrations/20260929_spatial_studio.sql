begin;
create table public.eme_spatial_projects (
 id uuid primary key, version bigint not null check(version>0),
 data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<40000),
 actor_id uuid not null references public.eme_profiles(id),updated_at timestamptz not null default now()
);
alter table public.eme_spatial_projects enable row level security;
revoke all on public.eme_spatial_projects from public,anon,authenticated,service_role;
grant select,insert,update on public.eme_spatial_projects to service_role;
create function public.eme_spatial_save(p_session text,p_id uuid,p_version bigint,p_data jsonb)
returns public.eme_spatial_projects language plpgsql security invoker set search_path='' as $$
declare actor public.eme_profiles; result public.eme_spatial_projects;
begin
 select p.* into actor from public.eme_profiles p join public.eme_sessions s on s.user_id=p.id
 where s.token_hash=p_session and p.active and not p.must_change and s.expires_at>now() and s.last_seen>now()-interval '30 minutes' for share of p,s;
 if actor.id is null then raise exception 'UNAUTHORIZED'; end if;
 if actor.role<>'admin' then raise exception 'FORBIDDEN'; end if;
 if p_id is null or p_version is null or p_version<0 or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>=40000 then raise exception 'INVALID_SPATIAL_PROJECT'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into result from public.eme_spatial_projects where id=p_id for update;
 if coalesce(result.version,0)<>p_version then raise exception 'STALE_VERSION'; end if;
 insert into public.eme_spatial_projects(id,version,data,actor_id) values(p_id,p_version+1,p_data,actor.id)
 on conflict(id) do update set version=excluded.version,data=excluded.data,actor_id=excluded.actor_id,updated_at=now() returning * into result;
 return result;
end;$$;
revoke all on function public.eme_spatial_save(text,uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.eme_spatial_save(text,uuid,bigint,jsonb) to service_role;
commit;
