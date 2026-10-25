-- EME Select · distribuição percentual dos novos leads
-- Executar uma vez no SQL Editor do projeto EME. Reexecutável, transacional.
-- Administradores também podem participar, quando selecionados pela gestão.
-- Não altera permissões, senhas, nem a regra atual. O primeiro acesso continua obrigatório.
-- Após executar: Portal > Leads e entradas > Distribuição dos novos leads.
begin;
alter table public.eme_lead_settings add column if not exists admin_brokers_enabled boolean not null default true;
alter table public.eme_lead_settings add column if not exists weights jsonb not null default '{}'::jsonb;
alter table public.eme_lead_settings add column if not exists distribution_state jsonb not null default '{}'::jsonb;
alter table public.eme_lead_settings drop constraint if exists eme_lead_settings_mode_check;
alter table public.eme_lead_settings add constraint eme_lead_settings_mode_check check(mode in('manual','property','round_robin','weighted'));
create or replace function public.eme_receive_lead(p_id uuid,p_hash text,p_property uuid,p_data jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare config public.eme_lead_settings; receipt public.eme_lead_receipts; entry public.eme_leads; property public.eme_cases; selected uuid; candidates uuid[]; pos integer; name text; v_phone text; current_weights jsonb; candidate record; score integer; best integer; total_weight integer;
begin
 if p_id is null or p_hash is null or p_hash!~'^[a-f0-9]{64}$' or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>=10000 then raise exception 'LEAD_INVALID'; end if;
 name:=p_data->>'name';v_phone:=p_data->>'phone';
 if name is null or length(name)<2 or length(name)>100 or v_phone is null or v_phone!~'^55[1-9]{2}[0-9]{8,9}$' or p_data->>'consentVersion' is distinct from 'select-contact-2026-10' then raise exception 'LEAD_INVALID'; end if;
 select * into config from public.eme_lead_settings where id='company' for update;
 select * into receipt from public.eme_lead_receipts where request_id=p_id;
 if found then if receipt.payload_hash is distinct from p_hash then raise exception 'LEAD_REQUEST_REUSED'; end if; return p_id; end if;
 if p_property is not null then
  select * into property from public.eme_cases where id=p_property for share;
  if property.id is null or property.data->'published' is null or property.data->'published'='null'::jsonb or coalesce((property.data->>'archived')::boolean,false) or property.data->>'deletedAt' is not null then raise exception 'LEAD_PROPERTY_UNAVAILABLE'; end if;
 end if;
 select * into entry from public.eme_leads where eme_leads.phone=v_phone and property_id is not distinct from p_property and (p_property is not null or data->>'interest'=p_data->>'interest') and status not in('won','lost') and updated_at>now()-interval '30 days' order by updated_at desc limit 1 for update;
 if entry.id is null then
  if config.mode='property' and p_property is not null then select id into selected from public.eme_profiles where id=property.assignee_id and active and not must_change for share; end if;
  if config.mode='round_robin' then
   select array_agg(p.id order by array_position(config.brokers,p.id)) into candidates from public.eme_profiles p where p.id=any(config.brokers) and p.active and not p.must_change and p.role in ('admin','corretor');
   if cardinality(candidates)>0 then pos:=coalesce(array_position(candidates,config.last_assignee),0);selected:=candidates[(pos%cardinality(candidates))+1];update public.eme_lead_settings set last_assignee=selected where id='company';end if;
  end if;
  if config.mode='weighted' then
   current_weights:='{}'::jsonb;best:=null;total_weight:=0;
   for candidate in select p.id from public.eme_profiles p where p.id=any(config.brokers) and p.active and not p.must_change and p.role in ('admin','corretor') order by array_position(config.brokers,p.id) for share loop
    if coalesce((config.weights->>candidate.id::text)::integer,0)>0 then
     total_weight:=total_weight+(config.weights->>candidate.id::text)::integer;
     score:=coalesce((config.distribution_state->>candidate.id::text)::integer,0)+(config.weights->>candidate.id::text)::integer;
     current_weights:=current_weights||jsonb_build_object(candidate.id::text,score);
     if best is null or score>best then selected:=candidate.id;best:=score;end if;
    end if;
   end loop;
   if selected is not null then current_weights:=current_weights||jsonb_build_object(selected::text,best-total_weight);end if;
   update public.eme_lead_settings set distribution_state=current_weights where id='company';
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

create or replace function public.eme_route_leads_v2(p_session text,p_version bigint,p_mode text,p_brokers uuid[],p_weights jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare actor public.eme_profiles; config public.eme_lead_settings;
begin
 select p.* into actor from public.eme_profiles p join public.eme_sessions s on s.user_id=p.id where s.token_hash=p_session and p.active and not p.must_change and p.role='admin' and s.expires_at>now() and s.last_seen>now()-interval '30 minutes' for share of p,s;
 if actor.id is null then raise exception 'FORBIDDEN'; end if;
 select * into config from public.eme_lead_settings where id='company' for update;
 if p_version is distinct from config.version then raise exception 'STALE_VERSION'; end if;
 if p_mode is null or p_mode not in('manual','property','round_robin','weighted') or p_brokers is null or cardinality(p_brokers)>100 or(p_mode in('round_robin','weighted') and cardinality(p_brokers)=0) or cardinality(p_brokers)<>(select count(distinct id) from unnest(p_brokers) id) or exists(select 1 from unnest(p_brokers) requested(id) where not exists(select 1 from public.eme_profiles p where p.id=requested.id and active and not must_change and role in ('admin','corretor'))) then raise exception 'LEAD_ROUTING_INVALID'; end if;
 if p_weights is null or jsonb_typeof(p_weights)<>'object' then raise exception 'LEAD_ROUTING_INVALID';end if;
 if p_mode='weighted' then
  if (select count(*) from jsonb_object_keys(p_weights))<>cardinality(p_brokers) or exists(select 1 from jsonb_each(p_weights) x where not(x.key=any(p_brokers::text[])) or jsonb_typeof(x.value)<>'number' or x.value::text!~'^[0-9]{1,3}$') then raise exception 'LEAD_ROUTING_INVALID';end if;
  if exists(select 1 from jsonb_each_text(p_weights) x where x.value::integer>100) or (select sum(x.value::integer) from jsonb_each_text(p_weights) x) is distinct from 100::bigint then raise exception 'LEAD_ROUTING_INVALID';end if;
 elsif p_weights<>'{}'::jsonb then raise exception 'LEAD_ROUTING_INVALID';end if;
 update public.eme_lead_settings set version=version+1,mode=p_mode,brokers=p_brokers,last_assignee=null,weights=p_weights,distribution_state='{}'::jsonb where id='company';
 insert into public.eme_audit(actor_id,action,detail) values(actor.id,'Distribuição de leads atualizada',jsonb_build_object('mode',p_mode,'brokers',p_brokers,'weights',p_weights)::text);
end $$;
-- Keep legacy callers compatible, with the same validation and reset semantics.
create or replace function public.eme_route_leads(p_session text,p_version bigint,p_mode text,p_brokers uuid[]) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform public.eme_route_leads_v2(p_session,p_version,p_mode,p_brokers,'{}'::jsonb);
end $$;
revoke all on function public.eme_route_leads_v2(text,bigint,text,uuid[],jsonb) from public,anon,authenticated;
grant execute on function public.eme_route_leads_v2(text,bigint,text,uuid[],jsonb) to service_role;
notify pgrst,'reload schema';
commit;

select name,email,role,active,must_change,
 case when not active then 'Conta suspensa'
 when must_change then 'Concluir primeiro acesso e trocar a senha'
 when role in ('admin','corretor') then 'Disponível para seleção na distribuição'
 else 'Revisar função' end as situacao
from public.eme_profiles where lower(email)='douglas-maraschin@hotmail.com';
