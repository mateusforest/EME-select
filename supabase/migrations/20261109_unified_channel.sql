create table public.eme_channel_visit_consent(id uuid primary key,phone text not null,actor_id uuid not null references public.eme_profiles(id));
alter table public.eme_channel_visit_consent enable row level security;
revoke all on public.eme_channel_visit_consent from public,anon,authenticated;
grant all on public.eme_channel_visit_consent to service_role;
create table public.eme_channel_state(phone text primary key references public.eme_inbox_contacts(phone),data jsonb not null default '{}',lease uuid,lease_until timestamptz);
create table public.eme_channel_events(phone text not null,event_id text not null,hash text not null,result jsonb not null,created_at timestamptz not null default now(),primary key(phone,event_id));
create table public.eme_channel_actions(id uuid primary key,phone text not null,actor_id uuid,kind text not null,fingerprint text not null,result jsonb not null,created_at timestamptz not null default now());
alter table public.eme_channel_state enable row level security;
alter table public.eme_channel_events enable row level security;
alter table public.eme_channel_actions enable row level security;
revoke all on public.eme_channel_state,public.eme_channel_events,public.eme_channel_actions from public,anon,authenticated;
grant all on public.eme_channel_state,public.eme_channel_events,public.eme_channel_actions to service_role;
create function public.eme_channel_turn(p_action text,p_phone text,p_event text,p_hash text,p_lock uuid default null,p_state jsonb default null,p_result jsonb default null) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.eme_channel_state;e public.eme_channel_events;token uuid;
begin
 if not exists(select 1 from public.eme_inbox_contacts where phone=p_phone) then raise exception 'FORBIDDEN'; end if;
 perform pg_advisory_xact_lock(hashtextextended('channel:'||p_phone,0));
 select * into e from public.eme_channel_events where phone=p_phone and event_id=p_event;
 if found then if e.hash<>p_hash then raise exception 'FORBIDDEN'; end if;return jsonb_build_object('cached',e.result);end if;
 insert into public.eme_channel_state(phone) values(p_phone) on conflict do nothing;
 select * into s from public.eme_channel_state where phone=p_phone for update;
 if p_action='begin' then
  if s.lease_until>now() then raise exception 'STALE_VERSION';end if;
  perform public.eme_limit('unified-channel:'||p_phone,40);
  token:=gen_random_uuid();update public.eme_channel_state set lease=token,lease_until=now()+interval '90 seconds' where phone=p_phone;
  return jsonb_build_object('lock',token,'state',s.data);
 elsif p_action='finish' then
  if s.lease is distinct from p_lock or s.lease_until<now() then raise exception 'STALE_VERSION';end if;
  update public.eme_channel_state set data=p_state,lease=null,lease_until=null where phone=p_phone;
  if p_state->>'status'='stopped' then update public.eme_inbox_outbox set status='cancelled' where phone=p_phone and source='automatic' and status='queued';end if;
  insert into public.eme_channel_events(phone,event_id,hash,result) values(p_phone,p_event,p_hash,p_result);
  return p_result;
 elsif p_action='release' then
  update public.eme_channel_state set lease=null,lease_until=null where phone=p_phone and lease=p_lock;return '{}';
 end if;raise exception 'FORBIDDEN';
end $$;
-- Scoped service capability. Temporary session exists only inside this transaction;
-- no browser token is created or returned. Existing portal RPCs recheck permissions.
create function public.eme_channel_action(p_phone text,p_actor uuid,p_id uuid,p_kind text,p_fingerprint text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare u public.eme_profiles; prior public.eme_channel_actions;cap text;result jsonb;record_id uuid;notified boolean:=false;
begin
 if not exists(select 1 from public.eme_inbox_contacts where phone=p_phone) then raise exception 'FORBIDDEN';end if;
 if p_kind<>'client_lead' then
  select p.* into u from public.eme_profiles p join public.eme_staff_wa_links l on l.user_id=p.id where l.phone=p_phone and p.id=p_actor and p.active and not p.must_change;
  if u.id is null then raise exception 'FORBIDDEN';end if;
  if p_kind='finance' and u.role<>'admin' then raise exception 'FORBIDDEN';end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('channel-action:'||p_id,0));
 select * into prior from public.eme_channel_actions where id=p_id;
 if found then if prior.phone<>p_phone or prior.actor_id is distinct from p_actor or prior.kind<>p_kind or prior.fingerprint<>p_fingerprint then raise exception 'FORBIDDEN';end if;return prior.result;end if;
 if p_kind='client_lead' then
  if p_actor is not null or p_payload->'data'->>'phone'<>p_phone or p_payload->'data'->>'consentVersion'<>'select-contact-2026-10' then raise exception 'FORBIDDEN';end if;
  record_id:=public.eme_receive_lead(p_id,p_fingerprint,null,p_payload->'data');
 else
  cap:='channel:'||gen_random_uuid()::text;
  insert into public.eme_sessions(token_hash,user_id,expires_at,last_seen) values(cap,u.id,now()+interval '1 minute',now());
  if p_kind='lead' then
   result:=public.eme_intake_lead(cap,p_id,p_fingerprint,p_payload->'data');record_id:=(result->>'id')::uuid;
  elsif p_kind='property' then
   perform public.eme_save_case(cap,p_id,0,p_payload->'data',u.id,'Cadastro pelo WhatsApp','Cadastro confirmado pelo titular do WhatsApp vinculado.');record_id:=p_id;
  elsif p_kind='visit' then
   if p_payload->'command'->>'type'<>'visit.save' then raise exception 'FORBIDDEN';end if;
   if p_payload ? 'notification' then insert into public.eme_channel_visit_consent values(p_id,p_payload->'notification'->>'phone',u.id) on conflict(id) do nothing;end if;
   perform public.eme_save_operations(cap,(p_payload->>'version')::bigint,p_id,p_payload->>'commandHash',p_payload->'command',p_payload->'next',(p_payload->>'propertyId')::uuid,null,p_payload->>'beforeHash',p_payload->>'afterHash');record_id:=p_id;
  elsif p_kind='finance' then
   if p_payload->'command'->>'type'<>'entry.save' or coalesce((p_payload->'command'->'data'->>'settleNow')::boolean,false) then raise exception 'FORBIDDEN';end if;
   perform public.eme_save_finance(cap,(p_payload->>'version')::bigint,p_id,p_payload->>'commandHash',p_payload->'command',p_payload->'next',p_payload->>'beforeHash',p_payload->>'afterHash');record_id:=p_id;
  else raise exception 'FORBIDDEN';end if;
  delete from public.eme_sessions where token_hash=cap;
 end if;
 if p_payload ? 'notification' then
  notified:=public.eme_channel_notify(p_id,p_payload->'notification'->>'phone',p_payload->'notification'->>'body',case when p_kind='client_lead' then (select user_id from public.eme_staff_wa_links where phone='5554984007919') else u.id end);
 end if;
 result:=jsonb_build_object('reference',record_id,'notificationQueued',notified);
 insert into public.eme_channel_actions(id,phone,actor_id,kind,fingerprint,result) values(p_id,p_phone,p_actor,p_kind,p_fingerprint,result);
 return result;
end $$;
alter table public.eme_inbox_outbox add column source text not null default 'manual';
create function public.eme_channel_notify(p_id uuid,p_phone text,p_body text,p_actor uuid) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from public.eme_inbox_contacts where phone=p_phone) then return false;end if;
 if not exists(select 1 from public.eme_profiles where id=p_actor and active and not must_change) then return false;end if;
 if exists(select 1 from public.eme_channel_state where phone=p_phone and data->>'status'='stopped') then return false;end if;
 if length(p_body) not between 1 and 4000 then raise exception 'FORBIDDEN';end if;
 insert into public.eme_inbox_outbox(id,phone,body,actor_id,message_key,source) values(p_id,p_phone,p_body,p_actor,'EME'||replace(p_id::text,'-',''),'automatic') on conflict(id) do nothing;
 return true;
end $$;
revoke all on function public.eme_channel_turn(text,text,text,text,uuid,jsonb,jsonb),public.eme_channel_action(text,uuid,uuid,text,text,jsonb),public.eme_channel_notify(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.eme_channel_turn(text,text,text,text,uuid,jsonb,jsonb),public.eme_channel_action(text,uuid,uuid,text,text,jsonb),public.eme_channel_notify(uuid,text,text,uuid) to service_role;
