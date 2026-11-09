-- Event notifications are scoped to pilot numbers. No historical backfill.
create function public.eme_channel_portal_notice() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare item jsonb;previous jsonb;target record;actor uuid;event text;body text;consent record;
begin
 if tg_table_name='eme_leads' then
  if new.status is not distinct from old.status and new.assignee_id is not distinct from old.assignee_id then return new;end if;
  select p.id into actor from public.eme_profiles p join public.eme_staff_wa_links l on l.user_id=p.id where p.active and not p.must_change and p.role='admin' order by p.id limit 1;
  if actor is null then return new;end if;
  event:='lead:'||new.id||':'||new.version;
  if new.data->>'consentVersion'='select-contact-2026-10' and new.status is distinct from old.status then
   perform public.eme_channel_notify(md5(event||':client')::uuid,new.data->>'phone','EME Select · Seu atendimento foi atualizado pela equipe. Para consultar ou conversar, responda por este canal. Referência: '||new.id,actor);
  end if;
  if new.assignee_id is distinct from old.assignee_id then
   for target in select l.phone,p.id from public.eme_staff_wa_links l join public.eme_profiles p on p.id=l.user_id where p.id=new.assignee_id and p.active and not p.must_change loop
    perform public.eme_channel_notify(md5(event||':'||target.phone)::uuid,target.phone,'EME Select · Um lead foi atribuído à sua conta. Consulte a ficha no portal. Referência: '||new.id,target.id);
   end loop;
  end if;
 elsif tg_table_name='eme_operations_state' then
  for item in select * from jsonb_array_elements(coalesce(new.data->'visits','[]')) loop
   select value into previous from jsonb_array_elements(coalesce(old.data->'visits','[]')) where value->>'id'=item->>'id';
   if previous is null or (previous->>'status'=item->>'status' and previous->>'startAt'=item->>'startAt') then continue;end if;
   event:='visit:'||(item->>'id')||':'||new.version;
   body:='EME Select · Visita atualizada: '||case item->>'status' when 'confirmed' then 'confirmada' when 'cancelled' then 'cancelada' when 'completed' then 'concluída' else 'aguardando confirmação' end||'. Referência: '||(item->>'id');
   for target in select l.phone,p.id from public.eme_staff_wa_links l join public.eme_profiles p on p.id=l.user_id where p.id=(item->>'brokerId')::uuid and p.active and not p.must_change loop
    perform public.eme_channel_notify(md5(event||':'||target.phone)::uuid,target.phone,body,target.id);
   end loop;
   select * into consent from public.eme_channel_visit_consent where id=(item->>'id')::uuid;
   if found then perform public.eme_channel_notify(md5(event||':'||consent.phone)::uuid,consent.phone,body,consent.actor_id);end if;
  end loop;
 elsif tg_table_name='eme_finance_state' then
  for item in select * from jsonb_array_elements(coalesce(new.data->'entries','[]')) loop
   select value into previous from jsonb_array_elements(coalesce(old.data->'entries','[]')) where value->>'id'=item->>'id';
   if previous is not null and previous->>'status'=item->>'status' then continue;end if;
   event:='finance:'||(item->>'id')||':'||new.version;
   for target in select l.phone,p.id from public.eme_staff_wa_links l join public.eme_profiles p on p.id=l.user_id where p.role='admin' and p.active and not p.must_change loop
    perform public.eme_channel_notify(md5(event||':'||target.phone)::uuid,target.phone,'EME Select · Há uma atualização no financeiro. Consulte o lançamento no portal. Referência: '||(item->>'id'),target.id);
   end loop;
  end loop;
 end if;
 return new;
end $$;
create trigger eme_channel_lead_notice after update on public.eme_leads for each row execute function public.eme_channel_portal_notice();
create trigger eme_channel_visit_notice after update on public.eme_operations_state for each row execute function public.eme_channel_portal_notice();
create trigger eme_channel_finance_notice after update on public.eme_finance_state for each row execute function public.eme_channel_portal_notice();
create table public.eme_channel_clock(id boolean primary key default true,last_run timestamptz not null);
alter table public.eme_channel_clock enable row level security;
revoke all on public.eme_channel_clock from public,anon,authenticated;
grant all on public.eme_channel_clock to service_role;
create function public.eme_channel_reminders() returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare last_run_at timestamptz;v jsonb;c record;target record;event text;total integer:=0;
begin
 if not pg_try_advisory_xact_lock(hashtextextended('eme-channel-reminders',0)) then return 0;end if;
 select last_run into last_run_at from public.eme_channel_clock where id=true;
 if last_run_at>now()-interval '1 minute' then return 0;end if;
 insert into public.eme_channel_clock values(true,now()) on conflict(id) do update set last_run=excluded.last_run;
 for v in select value from public.eme_operations_state s,jsonb_array_elements(s.data->'visits') where s.id='company' and value->>'status'='confirmed' and (value->>'startAt')::timestamptz between now() and now()+interval '2 hours' loop
  event:='reminder:'||(v->>'id')||':'||(v->>'startAt');
  for target in select l.phone,p.id from public.eme_staff_wa_links l join public.eme_profiles p on p.id=l.user_id where p.id=(v->>'brokerId')::uuid and p.active and not p.must_change loop
   perform public.eme_channel_notify(md5(event||':'||target.phone)::uuid,target.phone,'EME Select · Sua visita confirmada começa nas próximas duas horas. Confira horário e endereço no portal. Referência: '||(v->>'id'),target.id);total:=total+1;
  end loop;
  select * into c from public.eme_channel_visit_consent where id=(v->>'id')::uuid;
  if found then perform public.eme_channel_notify(md5(event||':'||c.phone)::uuid,c.phone,'EME Select · Lembrete: sua visita confirmada começa nas próximas duas horas. Consulte a equipe se precisar reagendar. Referência: '||(v->>'id'),c.actor_id);end if;
 end loop;
 return total;
end $$;
revoke all on function public.eme_channel_portal_notice(),public.eme_channel_reminders() from public,anon,authenticated;
grant execute on function public.eme_channel_reminders() to service_role;
