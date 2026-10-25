-- Executar após o SQL de distribuição percentual já instalado.
-- Permite selecionar administradores sem mudar sua função ou senha.
begin;
do $migration$
declare
  signature text;
  source text;
begin
  foreach signature in array array[
    'public.eme_receive_lead(uuid,text,uuid,jsonb)',
    'public.eme_route_leads_v2(text,bigint,text,uuid[],jsonb)'
  ] loop
    if to_regprocedure(signature) is null then
      raise exception 'Instale primeiro o SQL de distribuição percentual.';
    end if;
    source := pg_get_functiondef(to_regprocedure(signature));
    source := replace(source,
      'p.role=''corretor''',
      'p.role in (''admin'',''corretor'')');
    source := replace(source,
      'and role=''corretor''',
      'and role in (''admin'',''corretor'')');
    if position('role in (''admin'',''corretor'')' in source) = 0 then
      raise exception 'Versão inesperada da função %. Nenhuma alteração aplicada.', signature;
    end if;
    execute source;
  end loop;
end;
$migration$;
alter table public.eme_lead_settings
  add column if not exists admin_brokers_enabled boolean not null default true;
notify pgrst, 'reload schema';
commit;

select name, email, role, active, must_change,
  case
    when not active then 'Conta suspensa'
    when must_change then 'Concluir primeiro acesso e trocar a senha'
    when role in ('admin','corretor') then 'Disponível para seleção na distribuição'
    else 'Revisar função'
  end as situacao
from public.eme_profiles
where lower(email) = 'douglas-maraschin@hotmail.com';
