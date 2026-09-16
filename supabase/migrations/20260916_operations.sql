begin;

create table public.eme_operations_state(
 id text primary key check(id='company'),version bigint not null default 0 check(version>=0),
 data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<3000000),updated_at timestamptz not null default now()
);
create table public.eme_operations_audit(
 id bigint generated always as identity primary key,actor_id uuid not null references public.eme_profiles(id),
 property_id uuid references public.eme_cases(id),action text not null,command jsonb not null,
 state_version bigint not null,before_hash text not null,after_hash text not null,created_at timestamptz not null default now()
);
create table public.eme_operations_receipts(
 request_id uuid primary key,payload_hash text not null,command jsonb not null,state_version bigint not null,
 actor_id uuid not null references public.eme_profiles(id),property_id uuid references public.eme_cases(id),created_at timestamptz not null default now()
);
create table public.eme_operations_files(
 id uuid primary key,property_id uuid not null references public.eme_cases(id),filename text not null,
 mime_type text not null check(mime_type in('application/pdf','image/png','image/jpeg','image/webp')),
 size_bytes integer not null check(size_bytes between 1 and 2097152),sha256 text not null check(sha256~'^[a-f0-9]{64}$'),
 content_base64 text not null check(length(content_base64)<=2796204),created_by uuid not null references public.eme_profiles(id),created_at timestamptz not null default now()
);
alter table public.eme_operations_state enable row level security;
alter table public.eme_operations_audit enable row level security;
alter table public.eme_operations_receipts enable row level security;
alter table public.eme_operations_files enable row level security;
revoke all on public.eme_operations_state,public.eme_operations_audit,public.eme_operations_receipts,public.eme_operations_files from public,anon,authenticated,service_role;
grant select,update on public.eme_operations_state to service_role;
grant select,insert on public.eme_operations_audit,public.eme_operations_receipts,public.eme_operations_files to service_role;
revoke all on sequence public.eme_operations_audit_id_seq from public,anon,authenticated,service_role;
grant usage,select on sequence public.eme_operations_audit_id_seq to service_role;
insert into public.eme_operations_state(id,data) values('company','{"version":1,"tickets":[],"visits":[],"leases":[],"documents":[],"reviews":[]}'::jsonb);

create function public.eme_save_operations(
 p_session text,p_version bigint,p_request_id uuid,p_payload_hash text,p_command jsonb,p_data jsonb,
 p_property_id uuid,p_file jsonb,p_before_hash text,p_after_hash text
) returns public.eme_operations_state language plpgsql security invoker set search_path='' as $$
declare
 actor public.eme_profiles; current_state public.eme_operations_state; result public.eme_operations_state;
 receipt public.eme_operations_receipts; case_row public.eme_cases;
 action text; collection text; field text; candidate jsonb; previous jsonb; target jsonb; old_target jsonb;
 changed_count integer:=0; seen_ids text[]; previous_key jsonb; next_key jsonb;
begin
 select p.* into actor from public.eme_profiles p join public.eme_sessions s on s.user_id=p.id
 where s.token_hash=p_session and p.active and not p.must_change and s.expires_at>now()
 and s.last_seen>now()-interval '30 minutes' for share of p,s;
 if actor.id is null then raise exception 'UNAUTHORIZED'; end if;
 if actor.role not in('admin','corretor') then raise exception 'FORBIDDEN'; end if;
 action:=p_command->>'type';
 if action not in('ticket.save','ticket.message','visit.save','visit.confirm','visit.cancel','visit.complete','key.request','key.authorize','key.pickup','key.return','lease.save','lease.end','lease.generate','lease.receive','lease.repass','lease.cancel_charge','lease.maintenance','lease.inspection','document.upload','document.review','review.save') then raise exception 'OPERATIONS_INVALID_COMMAND'; end if;
 if actor.role<>'admin' and action in('visit.confirm','key.authorize','lease.end','lease.cancel_charge','document.review','review.save') then raise exception 'FORBIDDEN'; end if;
 -- Hold the live assignment while validating and committing. A reassignment waits
 -- for this transaction, and subsequent reads/downloads check it again.
 if action='review.save' then
  if p_property_id is not null then raise exception 'OPERATIONS_INVALID_SCOPE'; end if;
 else
  select * into case_row from public.eme_cases where id=p_property_id for share;
  if case_row.id is null or(actor.role<>'admin' and case_row.assignee_id is distinct from actor.id) then raise exception 'FORBIDDEN'; end if;
 end if;
 select * into current_state from public.eme_operations_state where id='company' for update;
 if current_state.id is null then raise exception 'OPERATIONS_NOT_READY'; end if;
 select * into receipt from public.eme_operations_receipts where request_id=p_request_id;
 if receipt.request_id is not null then
  if receipt.actor_id<>actor.id or receipt.payload_hash is distinct from p_payload_hash or receipt.command is distinct from p_command or receipt.property_id is distinct from p_property_id then raise exception 'OPERATIONS_REQUEST_REUSED' using errcode='23505'; end if;
  return current_state;
 end if;
 if p_version is null or p_version<0 or current_state.version<>p_version then raise exception 'STALE_VERSION'; end if;
 if p_request_id is null or p_payload_hash is null or p_payload_hash!~'^[a-f0-9]{64}$'
 or p_before_hash is null or p_before_hash!~'^[a-f0-9]{64}$' or p_after_hash is null or p_after_hash!~'^[a-f0-9]{64}$'
 or p_command is null or jsonb_typeof(p_command)<>'object' or jsonb_typeof(p_command->'data') is distinct from 'object' or octet_length(p_command::text)>30000 or p_command->'data'?'contentBase64'
 or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>=3000000 or p_data->>'version' is distinct from '1'
 or (select count(*) from jsonb_object_keys(p_data))<>6
 then raise exception 'OPERATIONS_INVALID_STATE'; end if;
 collection:=case split_part(action,'.',1) when 'ticket' then 'tickets' when 'visit' then 'visits' when 'key' then 'visits' when 'lease' then 'leases' when 'document' then 'documents' when 'review' then 'reviews' end;
 foreach field in array array['tickets','visits','leases','documents','reviews'] loop
  if jsonb_typeof(p_data->field) is distinct from 'array' then raise exception 'OPERATIONS_INVALID_STATE'; end if;
  if field<>collection and p_data->field is distinct from current_state.data->field then raise exception 'FORBIDDEN'; end if;
  seen_ids:=array[]::text[];
  for candidate in select value from jsonb_array_elements(p_data->field) loop
   if jsonb_typeof(candidate)<>'object' or coalesce(candidate->>'id','')!~'^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' or candidate->>'id'=any(seen_ids) then raise exception 'OPERATIONS_INVALID_STATE'; end if;
   seen_ids:=array_append(seen_ids,candidate->>'id');
   select value into previous from jsonb_array_elements(current_state.data->field) where value->>'id'=candidate->>'id';
   if candidate is distinct from previous then
    changed_count:=changed_count+1;target:=candidate;old_target:=previous;
    if field<>collection or(field<>'reviews' and candidate->>'propertyId' is distinct from p_property_id::text) then raise exception 'FORBIDDEN'; end if;
    if previous is not null and (previous->>'propertyId' is distinct from candidate->>'propertyId' or previous->>'createdBy' is distinct from candidate->>'createdBy' or previous->>'createdAt' is distinct from candidate->>'createdAt') then raise exception 'FORBIDDEN'; end if;
    if previous is null and candidate->>'createdBy' is distinct from actor.id::text then raise exception 'FORBIDDEN'; end if;
    if p_command->'data'->>'id' is not null and candidate->>'id' is distinct from p_command->'data'->>'id' then raise exception 'FORBIDDEN'; end if;
   end if;
  end loop;
  for previous in select value from jsonb_array_elements(current_state.data->field) loop
   if not(previous->>'id'=any(seen_ids)) then raise exception 'OPERATIONS_HISTORY_IMMUTABLE'; end if;
  end loop;
 end loop;
 if changed_count>1 then raise exception 'FORBIDDEN'; end if;
 -- Saving an unchanged form and repeating a generated competence are valid
 -- no-ops. The receipt still records the command once, without fabricating rows.
 if collection='tickets' and changed_count=1 then
  if action='ticket.save' and coalesce(old_target->'messages','[]'::jsonb) is distinct from target->'messages' then raise exception 'OPERATIONS_HISTORY_IMMUTABLE'; end if;
  if action='ticket.message' then
   if old_target is null or(target-array['messages','updatedAt']) is distinct from(old_target-array['messages','updatedAt'])
   or jsonb_array_length(target->'messages')<>jsonb_array_length(old_target->'messages')+1
   or(target->'messages'->-1->>'createdBy') is distinct from actor.id::text
   then raise exception 'FORBIDDEN'; end if;
   for previous in select value from jsonb_array_elements(old_target->'messages') with ordinality as e(value,position) loop
    if not exists(select 1 from jsonb_array_elements(target->'messages') m where m=previous) then raise exception 'OPERATIONS_HISTORY_IMMUTABLE'; end if;
   end loop;
   if (select jsonb_agg(value order by position) from jsonb_array_elements(target->'messages') with ordinality as e(value,position) where position<=jsonb_array_length(old_target->'messages')) is distinct from nullif(old_target->'messages','[]'::jsonb) then raise exception 'OPERATIONS_HISTORY_IMMUTABLE'; end if;
  end if;
 end if;
 if collection='visits' and changed_count=1 then
  previous_key:=coalesce(old_target->'key','{}'::jsonb);next_key:=target->'key';
  if actor.role<>'admin' then
   if action='visit.save' and (previous_key->>'status' in('out','returned') or target->>'status'<>'requested' or next_key->>'status'<>'none' or next_key->>'authorizedBy' is not null or next_key->>'authorizedAt' is not null or next_key->>'pickedUpAt' is not null or next_key->>'returnedAt' is not null) then raise exception 'FORBIDDEN'; end if;
   if action<>'visit.save' and (target-array['key','status','notes','cancelReason','updatedAt']) is distinct from (old_target-array['key','status','notes','cancelReason','updatedAt']) then raise exception 'FORBIDDEN'; end if;
   if action in('visit.cancel','visit.complete') and (previous_key->>'status'='out' or next_key is distinct from previous_key) then raise exception 'FORBIDDEN'; end if;
   if action='visit.cancel' and target->>'status'<>'cancelled' then raise exception 'FORBIDDEN'; end if;
   if action='visit.complete' and (old_target->>'status'<>'confirmed' or target->>'status'<>'completed') then raise exception 'FORBIDDEN'; end if;
   if action='key.request' and (previous_key->>'status' not in('none','requested') or next_key->>'status'<>'requested' or (next_key-'status') is distinct from(previous_key-'status')) then raise exception 'FORBIDDEN'; end if;
   if action in('key.pickup','key.return') then
    if next_key->>'authorizedBy' is distinct from previous_key->>'authorizedBy' or next_key->>'authorizedAt' is distinct from previous_key->>'authorizedAt' or next_key->>'returnDueAt' is distinct from previous_key->>'returnDueAt' or target->>'status' is distinct from old_target->>'status' then raise exception 'FORBIDDEN'; end if;
    if action='key.pickup' and (old_target->>'status'<>'confirmed' or previous_key->>'status'<>'authorized' or next_key->>'status'<>'out') then raise exception 'FORBIDDEN'; end if;
    if action='key.return' and (previous_key->>'status'<>'out' or next_key->>'status'<>'returned' or next_key->>'pickedUpAt' is distinct from previous_key->>'pickedUpAt' or next_key->>'custodianName' is distinct from previous_key->>'custodianName' or next_key->>'identityReference' is distinct from previous_key->>'identityReference') then raise exception 'FORBIDDEN'; end if;
   end if;
  end if;
  if action='visit.save' and exists(select 1 from jsonb_array_elements(current_state.data->'visits') v where v->>'id'<>target->>'id' and v->>'status' in('requested','confirmed') and (v->>'propertyId'=target->>'propertyId' or v->>'brokerId'=target->>'brokerId') and (v->>'startAt')::timestamptz<(target->>'endAt')::timestamptz and (v->>'endAt')::timestamptz>(target->>'startAt')::timestamptz) then raise exception 'OPERATIONS_SCHEDULE_CONFLICT' using errcode='23505'; end if;
 end if;
 if collection='leases' and actor.role<>'admin' and changed_count=1 then
  if action='lease.save' and(target->>'status'<>'active' or coalesce(old_target->'charges','[]'::jsonb) is distinct from target->'charges' or coalesce(old_target->'maintenance','[]'::jsonb) is distinct from target->'maintenance' or coalesce(old_target->'inspections','[]'::jsonb) is distinct from target->'inspections') then raise exception 'FORBIDDEN'; end if;
  if action<>'lease.save' and (target-array['charges','maintenance','inspections','updatedAt']) is distinct from(old_target-array['charges','maintenance','inspections','updatedAt']) then raise exception 'FORBIDDEN'; end if;
  if action in('lease.generate','lease.receive','lease.repass') and(target->'maintenance' is distinct from old_target->'maintenance' or target->'inspections' is distinct from old_target->'inspections') then raise exception 'FORBIDDEN'; end if;
  if action='lease.maintenance' and(target->'charges' is distinct from old_target->'charges' or target->'inspections' is distinct from old_target->'inspections') then raise exception 'FORBIDDEN'; end if;
  if action='lease.inspection' and(target->'charges' is distinct from old_target->'charges' or target->'maintenance' is distinct from old_target->'maintenance') then raise exception 'FORBIDDEN'; end if;
 end if;
 if action='document.upload' then
  if p_file is null or old_target is not null or target->>'status'<>'pending' or target->>'reviewedBy' is not null or target->>'reviewedAt' is not null
  or p_file->>'id' is distinct from target->>'id' or p_file->>'propertyId' is distinct from p_property_id::text
  or p_file->>'sha256' is distinct from target->>'sha256' or p_file->>'mimeType' is distinct from target->>'mimeType'
  or p_file->>'filename' is distinct from target->>'filename' or p_file->>'sizeBytes' is distinct from target->>'sizeBytes'
  or octet_length(decode(p_file->>'contentBase64','base64'))<>(p_file->>'sizeBytes')::integer
  or encode(sha256(decode(p_file->>'contentBase64','base64')),'hex') is distinct from p_file->>'sha256'
  then raise exception 'OPERATIONS_INVALID_FILE'; end if;
  insert into public.eme_operations_files(id,property_id,filename,mime_type,size_bytes,sha256,content_base64,created_by)
  values((p_file->>'id')::uuid,p_property_id,p_file->>'filename',p_file->>'mimeType',(p_file->>'sizeBytes')::integer,p_file->>'sha256',p_file->>'contentBase64',actor.id);
 elsif p_file is not null then raise exception 'OPERATIONS_INVALID_FILE'; end if;
 update public.eme_operations_state set data=p_data,version=version+1,updated_at=now() where id='company' returning * into result;
 insert into public.eme_operations_audit(actor_id,property_id,action,command,state_version,before_hash,after_hash) values(actor.id,p_property_id,action,p_command,result.version,p_before_hash,p_after_hash);
 insert into public.eme_operations_receipts(request_id,payload_hash,command,state_version,actor_id,property_id) values(p_request_id,p_payload_hash,p_command,result.version,actor.id,p_property_id);
 return result;
end $$;
revoke all on function public.eme_save_operations(text,bigint,uuid,text,jsonb,jsonb,uuid,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.eme_save_operations(text,bigint,uuid,text,jsonb,jsonb,uuid,jsonb,text,text) to service_role;
notify pgrst,'reload schema';
commit;
