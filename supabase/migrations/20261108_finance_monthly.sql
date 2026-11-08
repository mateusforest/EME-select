-- Execute no SQL Editor. Gera previsões; nunca confirma pagamentos.
begin;
create extension if not exists pg_cron;
create or replace function public.eme_generate_monthly_finance()
returns integer language plpgsql security invoker set search_path='' as $$
declare
 ledger public.eme_finance_state; before_data jsonb; next_data jsonb;
 rule jsonb; entry jsonb; period text; month_start date; competence_start date;
 actor uuid; total integer:=0; due_date date; competence_date date;
begin
 select * into ledger from public.eme_finance_state where id='company' for update;
 if ledger.id is null then return 0; end if;
 before_data:=ledger.data; next_data:=ledger.data;
 month_start:=date_trunc('month',now() at time zone 'America/Sao_Paulo')::date;
 period:=to_char(month_start,'YYYY-MM');
 for rule in select value from jsonb_array_elements(next_data->'recurrences') loop
  if not coalesce((rule->>'active')::boolean,false) or rule->>'startMonth'>period
     or (rule->>'endMonth' is not null and rule->>'endMonth'<period) then continue; end if;
  if exists(select 1 from jsonb_array_elements(next_data->'entries') e
    where e->>'recurrenceId'=rule->>'id' and e->>'recurrenceMonth'=period) then continue; end if;
  actor:=(rule->>'createdBy')::uuid;
  if not exists(select 1 from public.eme_profiles where id=actor) then
    raise exception 'Recorrência sem autor válido: %',rule->>'id';
  end if;
  due_date:=month_start + (least((rule->>'dueDay')::integer,extract(day from month_start+interval '1 month - 1 day')::integer)-1);
  competence_start:=(month_start+make_interval(months=>coalesce((rule->>'competenceOffset')::integer,0)))::date;
  competence_date:=competence_start+(least(coalesce((rule->>'competenceDay')::integer,1),extract(day from competence_start+interval '1 month - 1 day')::integer)-1);
  entry:=jsonb_build_object(
   'id',gen_random_uuid(),'description',rule->>'name','category',rule->>'category',
   'amountCents',(rule->>'amountCents')::bigint,'recognition','forecast','status','open',
   'competenceDate',to_char(competence_date,'YYYY-MM-DD'),'dueDate',to_char(due_date,'YYYY-MM-DD'),
   'settledDate',null,'accountId',null,'destinationAccountId',null,
   'behavior',rule->>'behavior','costCenter',coalesce(rule->>'costCenter',''),
   'brokerId',rule->'brokerId','propertyId',rule->'propertyId','partnerId',rule->'partnerId',
   'operationId',null,'recurrenceId',rule->>'id','recurrenceMonth',period,
   'notes',coalesce(rule->>'notes',''),'cancelReason',null,
   'createdAt',now(),'updatedAt',now(),'createdBy',actor);
  before_data:=next_data;
  next_data:=jsonb_set(next_data,'{entries}',(next_data->'entries')||jsonb_build_array(entry));
  ledger.version:=ledger.version+1;
  insert into public.eme_finance_audit(actor_id,action,command,state_version,before_hash,after_hash)
   values(actor,'recurrence.generate',jsonb_build_object('type','recurrence.generate','data',jsonb_build_object('id',rule->>'id','month',period),'source','monthly_schedule'),ledger.version,md5(before_data::text),md5(next_data::text));
  total:=total+1;
 end loop;
 if total>0 then update public.eme_finance_state set data=next_data,version=ledger.version,updated_at=now() where id='company'; end if;
 return total;
end;
$$;
revoke all on function public.eme_generate_monthly_finance() from public,anon,authenticated,service_role;
-- Diário às 06:00 UTC (03:00 em Brasília). Reexecuções não duplicam o mês.
select cron.schedule('eme-finance-monthly','0 6 * * *','select public.eme_generate_monthly_finance();');
select public.eme_generate_monthly_finance();
commit;
