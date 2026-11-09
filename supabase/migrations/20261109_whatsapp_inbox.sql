create table public.eme_inbox_contacts(phone text primary key, mode text not null default 'auto' check(mode in ('auto','human')));
insert into public.eme_inbox_contacts(phone) values('555499902688'),('5554984007919'),('5554981037089');
create table public.eme_inbox_messages(id text primary key,phone text not null references public.eme_inbox_contacts(phone),from_me boolean not null,body text not null,status text not null,sent_at timestamptz not null);
create index on public.eme_inbox_messages(phone,sent_at desc);
create table public.eme_inbox_outbox(id uuid primary key,phone text not null references public.eme_inbox_contacts(phone),body text not null,actor_id uuid not null references public.eme_profiles(id),status text not null default 'queued' check(status in ('queued','sending','sent','uncertain','cancelled')),message_key text unique,created_at timestamptz not null default now(),claimed_at timestamptz);
create index on public.eme_inbox_outbox(status,created_at);
create table public.eme_inbox_gateway(id boolean primary key default true check(id),connected boolean not null,last_seen timestamptz not null);
alter table public.eme_inbox_contacts enable row level security;
alter table public.eme_inbox_messages enable row level security;
alter table public.eme_inbox_outbox enable row level security;
alter table public.eme_inbox_gateway enable row level security;
revoke all on public.eme_inbox_contacts,public.eme_inbox_messages,public.eme_inbox_outbox,public.eme_inbox_gateway from public,anon,authenticated;
grant all on public.eme_inbox_contacts,public.eme_inbox_messages,public.eme_inbox_outbox,public.eme_inbox_gateway to service_role;

create function public.eme_inbox_user(p_session text,p_action text,p_phone text default '',p_id uuid default null,p_text text default '',p_mode text default '') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare u public.eme_profiles; result jsonb; existing public.eme_inbox_outbox;
begin
 select p.* into u from public.eme_profiles p join public.eme_sessions s on s.user_id=p.id where s.token_hash=p_session and s.expires_at>now() and s.last_seen>now()-interval '30 minutes' and p.active and not p.must_change;
 if u.id is null then raise exception 'UNAUTHORIZED'; end if;
 if u.role<>'admin' then raise exception 'FORBIDDEN'; end if;
 if p_action='list' then
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into result from (select c.phone,c.mode,p.name as account_name,m.body as last_message,m.sent_at as last_at from public.eme_inbox_contacts c left join public.eme_staff_wa_links l on l.phone=c.phone left join public.eme_profiles p on p.id=l.user_id left join lateral (select body,sent_at from public.eme_inbox_messages where phone=c.phone order by sent_at desc limit 1) m on true order by m.sent_at desc nulls last) r;
  return jsonb_build_object('contacts',result,'gateway',(select to_jsonb(g) from public.eme_inbox_gateway g));
 end if;
 if not exists(select 1 from public.eme_inbox_contacts where phone=p_phone) then raise exception 'FORBIDDEN'; end if;
 if p_action='messages' then
  return jsonb_build_object('mode',(select mode from public.eme_inbox_contacts where phone=p_phone),'messages',(select coalesce(jsonb_agg(to_jsonb(m) order by m.sent_at),'[]') from (select * from public.eme_inbox_messages where phone=p_phone order by sent_at desc limit 200) m),'outbox',(select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at),'[]') from (select id,body,status,created_at from public.eme_inbox_outbox where phone=p_phone and status<>'sent' order by created_at desc limit 50) q));
 elsif p_action='send' then
  if p_id is null or length(trim(p_text)) not between 1 and 4000 then raise exception 'FORBIDDEN'; end if;
  perform pg_advisory_xact_lock(hashtextextended('inbox-send:'||p_id,0));
  select * into existing from public.eme_inbox_outbox where id=p_id;
  if found then
   if existing.phone<>p_phone or existing.body<>p_text or existing.actor_id<>u.id then raise exception 'FORBIDDEN'; end if;
   return jsonb_build_object('id',existing.id,'status',existing.status);
  end if;
  perform public.eme_limit('inbox-send:'||u.id,30);
  update public.eme_inbox_contacts set mode='human' where phone=p_phone;
  insert into public.eme_inbox_outbox(id,phone,body,actor_id,message_key) values(p_id,p_phone,p_text,u.id,'EME'||replace(p_id::text,'-',''));
  return jsonb_build_object('id',p_id,'status','queued');
 elsif p_action='mode' then
  if p_mode not in ('auto','human') then raise exception 'FORBIDDEN'; end if;
  if p_mode='auto' and exists(select 1 from public.eme_inbox_outbox where phone=p_phone and status in ('queued','sending','uncertain')) then raise exception 'FORBIDDEN'; end if;
  update public.eme_inbox_contacts set mode=p_mode where phone=p_phone;
  return jsonb_build_object('ok',true);
 elsif p_action='cancel' then
  update public.eme_inbox_outbox set status='cancelled' where id=p_id and phone=p_phone and status='queued';
  return jsonb_build_object('ok',found);
 end if;
 raise exception 'FORBIDDEN';
end $$;

create function public.eme_inbox_bridge(p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare m jsonb; q public.eme_inbox_outbox; mode_value text;
begin
 if p_action='sync' then
  if jsonb_array_length(p_data->'messages')>600 then raise exception 'FORBIDDEN'; end if;
  insert into public.eme_inbox_gateway(id,connected,last_seen) values(true,(p_data->>'connected')::boolean,now()) on conflict(id) do update set connected=excluded.connected,last_seen=excluded.last_seen;
  update public.eme_inbox_outbox set status='uncertain' where status='sending' and claimed_at<now()-interval '2 minutes';
  for m in select * from jsonb_array_elements(p_data->'messages') loop
   if not exists(select 1 from public.eme_inbox_contacts where phone=m->>'phone') or length(m->>'body')>6000 or length(m->>'id') not between 1 and 150 or m->>'status' not in ('PENDING','SENT','DELIVERED','READ','FAILED','RECEIVED') then raise exception 'FORBIDDEN'; end if;
   insert into public.eme_inbox_messages values(m->>'id',m->>'phone',(m->>'from_me')::boolean,m->>'body',m->>'status',(m->>'sent_at')::timestamptz) on conflict(id) do update set status=case when public.eme_inbox_messages.status='READ' then 'READ' when public.eme_inbox_messages.status='DELIVERED' and excluded.status in ('PENDING','SENT') then 'DELIVERED' else excluded.status end;
   if (m->>'from_me')::boolean and m->>'status' in ('SENT','DELIVERED','READ') then update public.eme_inbox_outbox set status='sent' where message_key=m->>'id' and phone=m->>'phone'; end if;
  end loop;
  return jsonb_build_object('ok',true);
 elsif p_action='control' then
  select mode into mode_value from public.eme_inbox_contacts where phone=p_data->>'phone';
  if mode_value is null then raise exception 'FORBIDDEN'; end if;
  return jsonb_build_object('mode',mode_value);
 elsif p_action='claim' then
  if not exists(select 1 from public.eme_inbox_gateway where connected and last_seen>now()-interval '30 seconds') then return 'null'; end if;
  select * into q from public.eme_inbox_outbox where status='queued' order by created_at for update skip locked limit 1;
  if not found then return 'null'; end if;
  update public.eme_inbox_outbox set status='sending',claimed_at=now() where id=q.id;
  return to_jsonb(q);
 elsif p_action='ack' then
  if p_data->>'status' not in ('sent','uncertain') then raise exception 'FORBIDDEN'; end if;
  update public.eme_inbox_outbox set status=p_data->>'status' where id=(p_data->>'id')::uuid and status='sending';
  return jsonb_build_object('ok',true);
 end if;
 raise exception 'FORBIDDEN';
end $$;
revoke all on function public.eme_inbox_user(text,text,text,uuid,text,text),public.eme_inbox_bridge(text,jsonb) from public,anon,authenticated;
grant execute on function public.eme_inbox_user(text,text,text,uuid,text,text),public.eme_inbox_bridge(text,jsonb) to service_role;
