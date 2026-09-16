begin;

-- One company ledger. Values are application-validated integer centavos; this
-- service-only boundary also verifies the live EME administrator on every write.
create table public.eme_finance_state (
 id text primary key check(id='company'), version bigint not null default 0 check(version>=0),
 data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<2000000),
 updated_at timestamptz not null default now()
);
create table public.eme_finance_audit (
 id bigint generated always as identity primary key,
 actor_id uuid not null references public.eme_profiles(id),
 action text not null, command jsonb not null,
 state_version bigint not null, before_hash text not null, after_hash text not null,
 created_at timestamptz not null default now()
);
create table public.eme_finance_receipts (
 request_id uuid primary key, payload_hash text not null, command jsonb not null,
 state_version bigint not null, actor_id uuid not null references public.eme_profiles(id),
 created_at timestamptz not null default now()
);
alter table public.eme_finance_state enable row level security;
alter table public.eme_finance_audit enable row level security;
alter table public.eme_finance_receipts enable row level security;
revoke all on public.eme_finance_state, public.eme_finance_audit, public.eme_finance_receipts from public,anon,authenticated,service_role;
grant select,update on public.eme_finance_state to service_role;
grant select,insert on public.eme_finance_audit,public.eme_finance_receipts to service_role;
revoke all on sequence public.eme_finance_audit_id_seq from public,anon,authenticated,service_role;
grant usage,select on sequence public.eme_finance_audit_id_seq to service_role;

-- The empty schema is intentionally free of fabricated opening balances.
insert into public.eme_finance_state(id,data) values('company',
 '{"version":1,"accounts":[],"entries":[],"recurrences":[],"operations":[],"partners":[],"adjustments":[],"settings":{"reserveBps":null,"defaultCommissionBps":null,"cashTargetCents":null,"initialInvestmentCents":null}}'::jsonb);

create function public.eme_save_finance(
 p_session text,p_version bigint,p_request_id uuid,p_payload_hash text,p_command jsonb,
 p_data jsonb,p_before_hash text,p_after_hash text
) returns public.eme_finance_state language plpgsql security invoker set search_path='' as $$
declare actor public.eme_profiles; current_state public.eme_finance_state;
 receipt public.eme_finance_receipts; result public.eme_finance_state;
begin
 select p.* into actor from public.eme_profiles p join public.eme_sessions s on s.user_id=p.id
 where s.token_hash=p_session and p.active and not p.must_change
 and s.expires_at>now() and s.last_seen>now()-interval '30 minutes' for share of p,s;
 if actor.id is null then raise exception 'UNAUTHORIZED'; end if;
 if actor.role<>'admin' then raise exception 'FORBIDDEN'; end if;
 select * into current_state from public.eme_finance_state where id='company' for update;
 if current_state.id is null then raise exception 'FINANCE_NOT_READY'; end if;
 select * into receipt from public.eme_finance_receipts where request_id=p_request_id;
 if receipt.request_id is not null then
   if receipt.actor_id<>actor.id or receipt.payload_hash is distinct from p_payload_hash or receipt.command is distinct from p_command then
     raise exception 'FINANCE_REQUEST_REUSED' using errcode='23505';
   end if;
   return current_state;
 end if;
 if p_version is null or p_version<0 or current_state.version<>p_version then raise exception 'STALE_VERSION'; end if;
 if p_request_id is null or p_payload_hash is null or p_payload_hash!~'^[a-f0-9]{64}$'
 or p_before_hash is null or p_before_hash!~'^[a-f0-9]{64}$' or p_after_hash is null or p_after_hash!~'^[a-f0-9]{64}$'
 or p_command is null or jsonb_typeof(p_command)<>'object' or octet_length(p_command::text)>30000
 or coalesce(length(p_command->>'type'),0) not between 1 and 80
 or p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>=2000000
 or p_data->>'version' is distinct from '1'
 or jsonb_typeof(p_data->'accounts') is distinct from 'array'
 or jsonb_typeof(p_data->'entries') is distinct from 'array'
 or jsonb_typeof(p_data->'recurrences') is distinct from 'array'
 or jsonb_typeof(p_data->'operations') is distinct from 'array'
 or jsonb_typeof(p_data->'partners') is distinct from 'array'
 or jsonb_typeof(p_data->'adjustments') is distinct from 'array'
 or jsonb_typeof(p_data->'settings') is distinct from 'object'
 then raise exception 'FINANCE_INVALID_STATE'; end if;
 update public.eme_finance_state set data=p_data,version=version+1,updated_at=now() where id='company' returning * into result;
 insert into public.eme_finance_audit(actor_id,action,command,state_version,before_hash,after_hash)
 values(actor.id,p_command->>'type',p_command,result.version,p_before_hash,p_after_hash);
 insert into public.eme_finance_receipts(request_id,payload_hash,command,state_version,actor_id)
 values(p_request_id,p_payload_hash,p_command,result.version,actor.id);
 return result;
end $$;
revoke all on function public.eme_save_finance(text,bigint,uuid,text,jsonb,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.eme_save_finance(text,bigint,uuid,text,jsonb,jsonb,text,text) to service_role;
notify pgrst,'reload schema';
commit;
