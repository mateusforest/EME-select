create or replace function public.eme_staff_wa_message(p_phone text,p_message_id text,p_text text,p_content_hash text,p_code_hash text default '') returns jsonb
language plpgsql security definer set search_path = public,pg_temp as $$
declare ev public.eme_staff_wa_events; st public.eme_staff_wa_state; u public.eme_profiles; c public.eme_staff_wa_codes; reply text; result jsonb; ref uuid; cmd text:=lower(trim(p_text));
begin
 if p_phone not in ('555499902688','5554984007919') or length(p_message_id) not between 1 and 150 or length(p_text) not between 1 and 1500 then raise exception 'FORBIDDEN'; end if;
 perform pg_advisory_xact_lock(hashtextextended('staff-phone:'||p_phone,0));
 select * into ev from public.eme_staff_wa_events where phone=p_phone and message_id=p_message_id;
 if found then
  if ev.content_hash<>p_content_hash then raise exception 'FORBIDDEN'; end if;
  return ev.response;
 end if;
 perform public.eme_limit('staff-message:'||p_phone,35);
 insert into public.eme_staff_wa_state(phone) values(p_phone) on conflict do nothing;
 select * into st from public.eme_staff_wa_state where phone=p_phone for update;
 if cmd in ('parar','sair') then
  update public.eme_staff_wa_state set stopped=true,pending=null where phone=p_phone;
  reply:='Atendimento pausado. Quando quiser voltar, envie EQUIPE.';
 elsif st.stopped and cmd not in ('equipe','recomeçar','recomecar') then reply:='';
 elsif cmd ~ '^vincular [a-f0-9]{16}$' then
  select * into c from public.eme_staff_wa_codes where hash=p_code_hash and phone=p_phone and expires_at>now() for update;
  select * into u from public.eme_profiles where id=c.user_id and active and not must_change;
  if u.id is null then reply:='Código inválido ou expirado. Entre na sua conta em https://www.emeselect.com/acesso-select/equipe/inteligencia e gere outro código em WhatsApp da equipe.';
  elsif exists(select 1 from public.eme_staff_wa_links where phone=p_phone and user_id<>u.id) then reply:='Este WhatsApp já está vinculado a outra conta. Desvincule pela conta anterior no portal antes de continuar.';
  else
   insert into public.eme_staff_wa_links(phone,user_id) values(p_phone,u.id) on conflict(phone) do nothing;
   delete from public.eme_staff_wa_codes where hash=p_code_hash;
   update public.eme_staff_wa_state set stopped=false,pending=null where phone=p_phone;
   reply:='Seu WhatsApp foi vinculado à sua conta da EME Select. Posso registrar solicitações de suporte e pedidos de cadastro para revisão da equipe. Conte o que você precisa; não envie senhas.';
  end if;
 else
  select p.* into u from public.eme_profiles p join public.eme_staff_wa_links l on l.user_id=p.id where l.phone=p_phone and p.active and not p.must_change;
  if u.id is null then
   reply:='Para atender você como integrante da equipe, vincule seu WhatsApp à sua conta existente: https://www.emeselect.com/acesso-select/equipe/inteligencia . Em WhatsApp da equipe, gere um código e envie aqui VINCULAR seguido do código. Não envie sua senha.';
  elsif cmd in ('equipe','recomeçar','recomecar','cancelar') then
   update public.eme_staff_wa_state set stopped=false,pending=null where phone=p_phone;
   reply:='Olá! Como posso ajudar? Descreva sua dificuldade ou o cadastro que deseja solicitar. Vou preparar o pedido para você conferir antes de registrar no portal.';
  elsif st.pending is not null and cmd in ('sim','confirmo','confirmar','ok') then
   insert into public.eme_staff_wa_requests(user_id,phone,description,kind) values(u.id,p_phone,st.pending,case when lower(st.pending) ~ '(cadastr|atualiz|alterar)' then 'cadastro_atualizacao' else 'suporte' end) returning id into ref;
   update public.eme_staff_wa_state set pending=null where phone=p_phone;
   reply:='Solicitação registrada no portal para revisão da equipe.'||E'\n\nProtocolo: '||ref||E'\nVocê pode acompanhá-la em WhatsApp da equipe. Nenhum cadastro foi alterado automaticamente.';
  elsif cmd in ('sim','confirmo','confirmar','ok') then reply:='Não há pedido aguardando confirmação. Conte o que você precisa.';
  else
   update public.eme_staff_wa_state set pending=p_text,stopped=false where phone=p_phone;
   reply:='Vou registrar este pedido no portal para a equipe revisar:'||E'\n\n'||p_text||E'\n\nEstá correto? Responda SIM para registrar, escreva a descrição corrigida ou CANCELAR para desistir. Não inclua senhas ou dados sensíveis.';
  end if;
 end if;
 result:=jsonb_build_object('reply',reply,'answers','{}'::jsonb,'forward',false,'status','active','reference',ref);
 insert into public.eme_staff_wa_events(phone,message_id,content_hash,response) values(p_phone,p_message_id,p_content_hash,result);
 return result;
end $$;
