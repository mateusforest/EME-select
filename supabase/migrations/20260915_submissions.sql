begin;
-- Only the server receives submissions. Anonymous database access stays revoked.
create function public.eme_receive_submission(p_id uuid,p_data jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare responsible uuid; previous public.eme_cases; safe_data jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into previous from public.eme_cases where id=p_id;
 if previous.id is not null then
  if previous.data->>'submissionHash'=p_data->>'submissionHash' then return previous.id; end if;
  raise exception 'STALE_VERSION';
 end if;
 select id into responsible from public.eme_profiles where active and role='admin' order by created_at limit 1 for share;
 if responsible is null then raise exception 'NO_TEAM'; end if;
 safe_data=p_data || jsonb_build_object('stage','Recebido','published',null,'photos','[]'::jsonb);
 insert into public.eme_cases(id,assignee_id,data) values(p_id,responsible,safe_data);
 insert into public.eme_audit(case_id,actor_id,action,detail) values(p_id,responsible,'Envio pelo site','Recebimento automático. Dados declarados pelo solicitante, ainda sem conferência. Administrador atribuído como responsável; nenhuma aprovação realizada.');
 return p_id;
end $$;
revoke all on function public.eme_receive_submission(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.eme_receive_submission(uuid,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
