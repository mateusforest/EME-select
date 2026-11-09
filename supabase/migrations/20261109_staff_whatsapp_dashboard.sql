create function public.eme_staff_wa_dashboard(p_session text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare u public.eme_profiles; contacts jsonb; requests jsonb;
begin
 select p.* into u from public.eme_profiles p join public.eme_sessions s on s.user_id=p.id where s.token_hash=p_session and s.expires_at>now() and s.last_seen>now()-interval '30 minutes' and p.active and not p.must_change;
 if u.id is null then raise exception 'UNAUTHORIZED'; end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.phone),'[]') into contacts from (
  select a.phone,p.name as account_name,p.role,p.active,p.must_change,l.created_at as linked_at,l.user_id=u.id as own,
   case when l.phone is not null then case when not p.active or p.must_change then 'restricted' when coalesce(st.stopped,false) then 'paused' else 'linked' end when c.expires_at>now() then 'pending' else 'unlinked' end as status,
   c.expires_at as code_expires_at,
   (select max(e.created_at) from public.eme_staff_wa_events e where e.phone=a.phone and e.message_id not like 'deployment-check-%') as last_activity,
   (select count(*) from public.eme_staff_wa_links other where other.user_id=l.user_id)>1 as multiple_numbers
  from (values ('555499902688'),('5554984007919'),('5554981037089')) a(phone)
  left join public.eme_staff_wa_links l on l.phone=a.phone
  left join public.eme_profiles p on p.id=l.user_id
  left join public.eme_staff_wa_state st on st.phone=a.phone
  left join lateral (select expires_at,user_id from public.eme_staff_wa_codes where phone=a.phone and (user_id=u.id or u.role='admin') order by expires_at desc limit 1) c on true
  where u.role='admin' or l.user_id=u.id or (l.phone is null and c.user_id=u.id)
 ) r;
 select coalesce(jsonb_agg(to_jsonb(r)),'[]') into requests from (
  select q.id,q.phone,q.kind,q.description,q.status,q.created_at,p.name as account_name
  from public.eme_staff_wa_requests q join public.eme_profiles p on p.id=q.user_id
  where q.user_id=u.id or u.role='admin' order by q.created_at desc limit 100
 ) r;
 return jsonb_build_object('admin',u.role='admin','contacts',contacts,'requests',requests,'checkedAt',now());
end $$;
revoke all on function public.eme_staff_wa_dashboard(text) from public,anon,authenticated;
grant execute on function public.eme_staff_wa_dashboard(text) to service_role;
