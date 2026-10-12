begin;
create table public.eme_lead_settings(id text primary key check(id='company'),version bigint not null default 0,mode text not null default 'property' check(mode in('manual','property','round_robin')),brokers uuid[] not null default '{}',last_assignee uuid references public.eme_profiles(id));
create table public.eme_leads(id uuid primary key,version bigint not null default 1,property_id uuid references public.eme_cases(id),assignee_id uuid references public.eme_profiles(id),phone text not null check(phone~'^55[1-9]{2}[0-9]{8,9}$'),status text not null default 'new' check(status in('new','in_progress','waiting','visit','won','lost')),data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<10000),next_contact_at timestamptz,first_contact_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index eme_leads_assignee on public.eme_leads(assignee_id,updated_at desc);
create index eme_leads_phone on public.eme_leads(phone,updated_at desc);
create table public.eme_lead_receipts(request_id uuid primary key,payload_hash text not null,lead_id uuid not null references public.eme_leads(id),created_at timestamptz not null default now());
create table public.eme_lead_events(id uuid primary key default gen_random_uuid(),lead_id uuid not null references public.eme_leads(id),actor_id uuid references public.eme_profiles(id),action text not null,detail jsonb not null,created_at timestamptz not null default now());
alter table public.eme_lead_settings enable row level security;
alter table public.eme_leads enable row level security;
alter table public.eme_lead_receipts enable row level security;
alter table public.eme_lead_events enable row level security;
revoke all on public.eme_lead_settings,public.eme_leads,public.eme_lead_receipts,public.eme_lead_events from public,anon,authenticated,service_role;
grant select,insert,update on public.eme_lead_settings,public.eme_leads to service_role;
grant select,insert on public.eme_lead_receipts,public.eme_lead_events to service_role;
insert into public.eme_lead_settings(id) values('company');

create function public.eme_receive_lead(p_id uuid,p_hash text,p_property uuid,p_data jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare config public.eme_lead_settings; receipt public.eme_lead_receipts; entry public.eme_leads; property public.eme_cases; selected uuid; candidates uuid[]; pos integer; name text; v_phone text;
begin
 if p_id is null or p_hash is null or p_hash!~'^[a-f0-9]{64}$' or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>=10000 then raise exception 'LEAD_INVALID'; end if;
 name:=p_data->>'name';v_phone:=p_data->>'phone';
 if name is null or length(name)<2 or length(name)>100 or v_phone is null or v_phone!~'^55[1-9]{2}[0-9]{8,9}$' or p_data->>'consentVersion' is distinct from 'select-contact-2026-10' then raise exception 'LEAD_INVALID'; end if;
 select * into config from public.eme_lead_settings where id='company' for update;
 select * into receipt from public.eme_lead_receipts where request_id=p_id;
 if found then if receipt.payload_hash is distinct from p_hash then raise exception 'LEAD_REQUEST_REUSED'; end if; return p_id; end if;
 if p_property is not null then
  select * into property from public.eme_cases where id=p_property for share;
  if property.id is null or property.data->'published' is null or property.data->'published'='null'::jsonb then raise exception 'LEAD_PROPERTY_UNAVAILABLE'; end if;
 end if;
 select * into entry from public.eme_leads where eme_leads.phone=v_phone and property_id is not distinct from p_property and (p_property is not null or data->>'interest'=p_data->>'interest') and status not in('won','lost') and updated_at>now()-interval '30 days' order by updated_at desc limit 1 for update;
 if entry.id is null then
  if config.mode='property' and p_property is not null then select id into selected from public.eme_profiles where id=property.assignee_id and active and not must_change for share; end if;
  if config.mode='round_robin' then
   select array_agg(p.id order by array_position(config.brokers,p.id)) into candidates from public.eme_profiles p where p.id=any(config.brokers) and p.active and not p.must_change and p.role='corretor';
   if cardinality(candidates)>0 then pos:=coalesce(array_position(candidates,config.last_assignee),0);selected:=candidates[(pos%cardinality(candidates))+1];update public.eme_lead_settings set last_assignee=selected where id='company';end if;
  end if;
  insert into public.eme_leads(id,property_id,assignee_id,phone,data) values(p_id,p_property,selected,v_phone,p_data) returning * into entry;
  insert into public.eme_lead_events(lead_id,action,detail) values(entry.id,'received',p_data||jsonb_build_object('routing',config.mode,'assigneeId',selected));
 else
  update public.eme_leads set version=version+1,updated_at=now() where id=entry.id;
  insert into public.eme_lead_events(lead_id,action,detail) values(entry.id,'received_again',p_data);
 end if;
 insert into public.eme_lead_receipts(request_id,payload_hash,lead_id) values(p_id,p_hash,entry.id);
 return p_id;
end $$;

create function public.eme_update_lead(p_session text,p_id uuid,p_version bigint,p_status text,p_assignee uuid,p_next timestamptz,p_note text) returns void language plpgsql security invoker set search_path='' as $$
declare actor public.eme_profiles; entry public.eme_leads;
begin
 select p.* into actor from public.eme_profiles p join public.eme_sessions s on s.user_id=p.id where s.token_hash=p_session and p.active and not p.must_change and s.expires_at>now() and s.last_seen>now()-interval '30 minutes' for share of p,s;
 if actor.id is null then raise exception 'UNAUTHORIZED'; end if;
 select * into entry from public.eme_leads where id=p_id for update;
 if entry.id is null or(actor.role<>'admin' and entry.assignee_id is distinct from actor.id) then raise exception 'FORBIDDEN'; end if;
 if p_version is distinct from entry.version then raise exception 'STALE_VERSION'; end if;
 if actor.role<>'admin' and p_assignee is distinct from entry.assignee_id then raise exception 'FORBIDDEN'; end if;
 if p_assignee is not null and not exists(select 1 from public.eme_profiles where id=p_assignee and active and not must_change) then raise exception 'LEAD_ASSIGNEE_INVALID'; end if;
 if p_status is null or p_status not in('new','in_progress','waiting','visit','won','lost') or length(coalesce(p_note,''))>2000 or(p_status in('in_progress','waiting','visit') and p_next is null) then raise exception 'LEAD_INVALID'; end if;
 update public.eme_leads set version=version+1,status=p_status,assignee_id=p_assignee,next_contact_at=p_next,first_contact_at=case when p_status in('in_progress','waiting','visit','won') then coalesce(first_contact_at,now()) else first_contact_at end,updated_at=now() where id=p_id;
 insert into public.eme_lead_events(lead_id,actor_id,action,detail) values(p_id,actor.id,'updated',jsonb_build_object('author',actor.name,'fromStatus',entry.status,'status',p_status,'fromAssigneeId',entry.assignee_id,'assigneeId',p_assignee,'nextContactAt',p_next,'note',coalesce(p_note,'')));
end $$;

create function public.eme_route_leads(p_session text,p_version bigint,p_mode text,p_brokers uuid[]) returns void language plpgsql security invoker set search_path='' as $$
declare actor public.eme_profiles; config public.eme_lead_settings;
begin
 select p.* into actor from public.eme_profiles p join public.eme_sessions s on s.user_id=p.id where s.token_hash=p_session and p.active and not p.must_change and p.role='admin' and s.expires_at>now() and s.last_seen>now()-interval '30 minutes' for share of p,s;
 if actor.id is null then raise exception 'FORBIDDEN'; end if;
 select * into config from public.eme_lead_settings where id='company' for update;
 if p_version is distinct from config.version then raise exception 'STALE_VERSION'; end if;
 if p_mode is null or p_mode not in('manual','property','round_robin') or p_brokers is null or cardinality(p_brokers)>100 or(p_mode='round_robin' and cardinality(p_brokers)=0) or cardinality(p_brokers)<>(select count(distinct id) from unnest(p_brokers) id) or exists(select 1 from unnest(p_brokers) requested(id) where not exists(select 1 from public.eme_profiles p where p.id=requested.id and active and not must_change and role='corretor')) then raise exception 'LEAD_ROUTING_INVALID'; end if;
 update public.eme_lead_settings set version=version+1,mode=p_mode,brokers=p_brokers,last_assignee=null where id='company';
 insert into public.eme_audit(actor_id,action,detail) values(actor.id,'Distribuição de leads atualizada',jsonb_build_object('mode',p_mode,'brokers',p_brokers)::text);
end $$;
revoke all on function public.eme_receive_lead(uuid,text,uuid,jsonb),public.eme_update_lead(text,uuid,bigint,text,uuid,timestamptz,text),public.eme_route_leads(text,bigint,text,uuid[]) from public,anon,authenticated;
grant execute on function public.eme_receive_lead(uuid,text,uuid,jsonb),public.eme_update_lead(text,uuid,bigint,text,uuid,timestamptz,text),public.eme_route_leads(text,bigint,text,uuid[]) to service_role;
notify pgrst,'reload schema';
commit;
