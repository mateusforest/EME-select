create table public.eme_channel_materials(
 id uuid primary key,flow_id uuid not null,actor_id uuid not null references public.eme_profiles(id),
 case_id uuid references public.eme_cases(id),filename text not null,mime_type text not null,
 content_base64 text not null check(length(content_base64)<=2800000),metadata jsonb not null default '{}',created_at timestamptz not null default now()
);
alter table public.eme_channel_materials enable row level security;
revoke all on public.eme_channel_materials from public,anon,authenticated;
grant all on public.eme_channel_materials to service_role;
create index eme_channel_materials_flow on public.eme_channel_materials(flow_id,actor_id);
create index eme_channel_materials_case on public.eme_channel_materials(case_id);
-- Preserve the existing transaction, receipts and permission checks; extend only property saves.
do $migration$
declare definition text; old_branch text;new_branch text;
begin
 definition:=pg_get_functiondef('public.eme_channel_action(text,uuid,uuid,text,text,jsonb)'::regprocedure);
 old_branch:=$old$perform public.eme_save_case(cap,p_id,0,p_payload->'data',u.id,'Cadastro pelo WhatsApp','Cadastro confirmado pelo titular do WhatsApp vinculado.');record_id:=p_id;$old$;
 new_branch:=$new$record_id:=coalesce((p_payload->>'targetId')::uuid,p_id);
   if record_id<>p_id and not exists(select 1 from public.eme_cases where id=record_id and (u.role='admin' or assignee_id=u.id) and data->>'deletedAt' is null) then raise exception 'FORBIDDEN';end if;
   perform public.eme_save_case(cap,record_id,coalesce((p_payload->>'version')::bigint,0),p_payload->'data',case when record_id=p_id then u.id else (select assignee_id from public.eme_cases where id=record_id) end,'Cadastro pelo WhatsApp','Dados e materiais confirmados pelo titular do WhatsApp vinculado.');
   update public.eme_channel_materials set case_id=record_id where flow_id=p_id and actor_id=u.id and case_id is null;$new$;
 if position(old_branch in definition)=0 then raise exception 'Unexpected channel action definition';end if;
 execute replace(definition,old_branch,new_branch);
end $migration$;
