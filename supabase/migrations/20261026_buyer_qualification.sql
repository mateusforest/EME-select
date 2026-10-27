-- Captação e perfil de busca. Não altera a distribuição nem os leads existentes.
begin;

create or replace function public.eme_intake_lead(p_session text,p_id uuid,p_hash text,p_data jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor public.eme_profiles; entry public.eme_leads; receipt public.eme_lead_receipts; v_phone text; duplicate boolean:=false;
begin
 select p.* into actor from public.eme_profiles p join public.eme_sessions s on s.user_id=p.id
 where s.token_hash=p_session and p.active and not p.must_change and p.role in('admin','corretor')
 and s.expires_at>now() and s.last_seen>now()-interval '30 minutes' for share of p,s;
 if actor.id is null then raise exception 'UNAUTHORIZED'; end if;
 if p_id is null or p_hash is null or p_hash!~'^[a-f0-9]{64}$' or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>8000 then raise exception 'LEAD_INVALID'; end if;
 v_phone:=p_data->>'phone';
 if v_phone is null or v_phone!~'^55[1-9]{2}[0-9]{8,9}$' or coalesce(length(p_data->>'name'),0) not between 2 and 100
 or coalesce(p_data->'source'->>'origin','') not in('whatsapp','instagram','referral','network','email','facebook','site')
 or coalesce(p_data->'qualification'->'profile'->>'contactPermission','') not in('unknown','granted','declined') then raise exception 'LEAD_INVALID'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text,0));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_phone,1));
 select * into receipt from public.eme_lead_receipts where request_id=p_id;
 if receipt.request_id is not null then
  if receipt.payload_hash<>p_hash then raise exception 'LEAD_REQUEST_REUSED'; end if;
  select * into entry from public.eme_leads where id=receipt.lead_id;
  if actor.role<>'admin' and entry.assignee_id is distinct from actor.id then raise exception 'FORBIDDEN'; end if;
  return jsonb_build_object('id',entry.id,'duplicate',entry.id<>p_id);
 end if;
 select * into entry from public.eme_leads where phone=v_phone and status not in('won','lost') order by updated_at desc limit 1 for update;
 if entry.id is not null then
  if actor.role<>'admin' and entry.assignee_id is distinct from actor.id then raise exception 'FORBIDDEN'; end if;
  duplicate:=true;
  insert into public.eme_lead_events(lead_id,actor_id,action,detail) values(entry.id,actor.id,'manual_reference',jsonb_build_object('author',actor.name,'note','Nova entrada do mesmo contato.','source',p_data->'source'));
 else
  insert into public.eme_leads(id,assignee_id,phone,data) values(p_id,actor.id,v_phone,p_data||jsonb_build_object('capturedBy',actor.name)) returning * into entry;
  insert into public.eme_lead_events(lead_id,actor_id,action,detail) values(entry.id,actor.id,'manual_received',jsonb_build_object('author',actor.name,'note','Contato cadastrado pela equipe.','source',p_data->'source'));
 end if;
 insert into public.eme_lead_receipts(request_id,payload_hash,lead_id) values(p_id,p_hash,entry.id);
 return jsonb_build_object('id',entry.id,'duplicate',duplicate);
end $$;

create or replace function public.eme_qualify_lead(p_session text,p_id uuid,p_version bigint,p_profile jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare actor public.eme_profiles; entry public.eme_leads; k text;
begin
 select p.* into actor from public.eme_profiles p join public.eme_sessions s on s.user_id=p.id
 where s.token_hash=p_session and p.active and not p.must_change and p.role in('admin','corretor')
 and s.expires_at>now() and s.last_seen>now()-interval '30 minutes' for share of p,s;
 if actor.id is null then raise exception 'UNAUTHORIZED'; end if;
 select * into entry from public.eme_leads where id=p_id for update;
 if entry.id is null or(actor.role<>'admin' and entry.assignee_id is distinct from actor.id) then raise exception 'FORBIDDEN'; end if;
 if p_version is distinct from entry.version then raise exception 'STALE_VERSION'; end if;
 if p_profile is null or jsonb_typeof(p_profile)<>'object' or octet_length(p_profile::text)>4500
 or (select count(*) from jsonb_object_keys(p_profile))<>14
 or not(p_profile ?& array['operation','city','neighborhood','propertyType','budgetMax','bedrooms','purpose','timeline','payment','essentials','email','whatsappUpdates','emailUpdates','contactPermission']) then raise exception 'LEAD_INVALID'; end if;
 -- There are fourteen profile keys. Reject unknown keys without relying on ordering.
 if exists(select 1 from jsonb_object_keys(p_profile) key where key not in('operation','city','neighborhood','propertyType','budgetMax','bedrooms','purpose','timeline','payment','essentials','email','whatsappUpdates','emailUpdates','contactPermission')) then raise exception 'LEAD_INVALID'; end if;
 foreach k in array array['operation','city','neighborhood','propertyType','purpose','timeline','payment','essentials','email','whatsappUpdates','emailUpdates','contactPermission'] loop
  if jsonb_typeof(p_profile->k) is distinct from 'string' then raise exception 'LEAD_INVALID'; end if;
 end loop;
 if p_profile->>'operation' not in('','comprar','alugar') or p_profile->>'propertyType' not in('','Casa','Apartamento','Terreno','Comercial')
 or p_profile->>'purpose' not in('','home','investment') or p_profile->>'timeline' not in('','now','quarter','semester','exploring')
 or p_profile->>'payment' not in('','cash','financing','exchange') or p_profile->>'contactPermission' not in('unknown','granted','declined')
 or p_profile->>'whatsappUpdates' not in('unknown','granted','declined') or p_profile->>'emailUpdates' not in('unknown','granted','declined')
 or length(p_profile->>'email')>254 or (p_profile->>'email'<>'' and p_profile->>'email'!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
 or length(p_profile->>'city')>100 or length(p_profile->>'neighborhood')>140 or length(p_profile->>'essentials')>1000 then raise exception 'LEAD_INVALID'; end if;
 foreach k in array array['budgetMax','bedrooms'] loop
  if jsonb_typeof(p_profile->k) not in('number','null') then raise exception 'LEAD_INVALID'; end if;
 end loop;
 if p_profile->>'budgetMax' is not null and ((p_profile->>'budgetMax')::numeric<=0 or (p_profile->>'budgetMax')::numeric>10000000000 or (p_profile->>'budgetMax')::numeric<>round((p_profile->>'budgetMax')::numeric,2)) then raise exception 'LEAD_INVALID'; end if;
 if p_profile->>'bedrooms' is not null and ((p_profile->>'bedrooms')::numeric<0 or (p_profile->>'bedrooms')::numeric>30 or (p_profile->>'bedrooms')::numeric<>trunc((p_profile->>'bedrooms')::numeric)) then raise exception 'LEAD_INVALID'; end if;
 update public.eme_leads set data=data||jsonb_build_object('qualification',jsonb_build_object('profile',p_profile,'reviewedBy',actor.name,'reviewedAt',now())),version=version+1,updated_at=now() where id=p_id;
 insert into public.eme_lead_events(lead_id,actor_id,action,detail) values(p_id,actor.id,'qualified',jsonb_build_object('author',actor.name,'note','Perfil de busca e autorizações revisados.','permissions',jsonb_build_object('contact',p_profile->>'contactPermission','whatsapp',p_profile->>'whatsappUpdates','email',p_profile->>'emailUpdates')));
end $$;

revoke all on function public.eme_intake_lead(text,uuid,text,jsonb),public.eme_qualify_lead(text,uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.eme_intake_lead(text,uuid,text,jsonb),public.eme_qualify_lead(text,uuid,bigint,jsonb) to service_role;
alter table public.eme_lead_settings add column if not exists qualification_version integer not null default 1;
notify pgrst,'reload schema';
commit;
