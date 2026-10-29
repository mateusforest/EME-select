-- READ ONLY. Run in the EXISTING emeselect project; no customer data is selected.
-- This is a preflight, not permission to apply migrations or send messages.
begin read only;
with expected(name) as (values
 ('eme_switch_requests'),('eme_switch_events'),('eme_switch_partner_offers'),
 ('eme_switch_deal_invites'),('eme_switch_deal_audit'),('eme_switch_professionals'),
 ('eme_switch_outbox'),('eme_switch_consent_events')),
tables as (
 select e.name,c.oid,c.relrowsecurity
 from expected e left join pg_class c on c.oid=to_regclass('public.'||e.name)
), access as (
 select t.name, t.oid is not null as exists, coalesce(t.relrowsecurity,false) as rls,
   r.role,
   case when t.oid is not null then has_table_privilege(r.role,t.oid,'SELECT') end as can_select,
   case when t.oid is not null then has_table_privilege(r.role,t.oid,'INSERT') end as can_insert,
   case when t.oid is not null then has_table_privilege(r.role,t.oid,'UPDATE') end as can_update,
   case when t.oid is not null then has_table_privilege(r.role,t.oid,'DELETE') end as can_delete,
   case when t.oid is not null then has_table_privilege(r.role,t.oid,'TRUNCATE') end as can_truncate
 from tables t cross join (values ('anon'),('authenticated'),('service_role')) r(role)
)
select jsonb_build_object(
 'profile_dependency_present',to_regclass('public.eme_profiles') is not null,
 'tables_and_grants',(select jsonb_agg(to_jsonb(a)) from access a),
 'policies',(select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) from pg_policies p where p.schemaname='public' and p.tablename in (select name from expected)),
 'columns',(select jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'type',data_type)) from information_schema.columns where table_schema='public' and table_name in (select name from expected)),
 'functions',(select jsonb_agg(jsonb_build_object('name',p.proname,'security_definer',p.prosecdef,'config',p.proconfig,
   'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),
   'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
   'service_execute',has_function_privilege('service_role',p.oid,'EXECUTE')))
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'eme_switch_%')
) as preflight;
rollback;
