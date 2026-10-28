-- M Switch — piloto independente da operação atual.
-- Aplique no Supabase antes de publicar frontend/API. Não altera leads, inventário ou pagamentos.
begin;
create table if not exists public.eme_switch_requests (
  id uuid primary key,
  request_id uuid not null unique,
  kind text not null check(kind in ('sell','swap','buy','invest')),
  name text not null check(char_length(name) between 2 and 100),
  phone text not null check(phone ~ '^55[1-9]{2}9?[0-9]{8}$'),
  city text not null check(char_length(city) between 2 and 100),
  property_type text not null check(char_length(property_type) between 2 and 60),
  asking_cents bigint not null check(asking_cents between 1000000 and 1000000000000),
  target_city text not null default '',
  target_budget_cents bigint check(target_budget_cents between 1000000 and 1000000000000),
  notes text not null default '' check(char_length(notes)<=1200),
  source text not null default 'site' check(char_length(source) between 2 and 80),
  contact_opt_in boolean not null default false,
  updates_opt_in boolean not null default false,
  privacy_accepted boolean not null default false,
  status text not null default 'new' check(status in ('new','reviewing','qualified','negotiating','closed','archived')),
  owner_id uuid references public.eme_profiles(id) on delete set null,
  ownership_reviewed boolean not null default false,
  sharing_authorized boolean not null default false,
  funds_verified boolean not null default false,
  min_acceptable_cents bigint check(min_acceptable_cents between 1000000 and 1000000000000),
  review_note text not null default '' check(char_length(review_note)<=1000),
  reviewed_by uuid references public.eme_profiles(id) on delete set null,
  version bigint not null default 1 check(version>=1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint switch_contact_permission check(contact_opt_in and privacy_accepted),
  constraint switch_investor_fields check(
    kind not in ('invest','buy') or (not ownership_reviewed and not sharing_authorized and min_acceptable_cents is null)
  ),
  constraint switch_asset_fields check(kind = 'invest' or not funds_verified)
);
create index if not exists eme_switch_requests_owner_status_idx on public.eme_switch_requests(owner_id,status,created_at desc);
create index if not exists eme_switch_requests_kind_city_idx on public.eme_switch_requests(kind,city,property_type);

create table if not exists public.eme_switch_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.eme_switch_requests(id) on delete restrict,
  changed_by uuid references public.eme_profiles(id) on delete set null,
  old_status text,
  new_status text not null,
  old_version bigint,
  new_version bigint not null,
  at timestamptz not null default now()
);
create or replace function public.eme_switch_record_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.eme_switch_events(request_id,new_status,new_version)
    values(new.id,new.status,new.version);
  else
    if new.version <> old.version + 1 then
      raise exception 'SWITCH_VERSION_INVALID';
    end if;
    insert into public.eme_switch_events(request_id,changed_by,old_status,new_status,old_version,new_version)
    values(new.id,new.reviewed_by,old.status,new.status,old.version,new.version);
  end if;
  return new;
end;
$$;
drop trigger if exists eme_switch_audit on public.eme_switch_requests;
create trigger eme_switch_audit after insert or update on public.eme_switch_requests
for each row execute function public.eme_switch_record_change();
alter table public.eme_switch_requests enable row level security;
alter table public.eme_switch_events enable row level security;
revoke all on public.eme_switch_requests, public.eme_switch_events from public, anon, authenticated, service_role;
grant select,insert,update on public.eme_switch_requests to service_role;
grant select,insert on public.eme_switch_events to service_role;
revoke all on sequence public.eme_switch_events_id_seq from public,anon,authenticated,service_role;
grant usage,select on sequence public.eme_switch_events_id_seq to service_role;

-- Inventário privado de ofertas encaminhadas por parceiros com autorização escrita.
create table if not exists public.eme_switch_partner_offers(
 id uuid primary key,
 partner text not null check(char_length(partner) between 3 and 100),
 ref text not null check(char_length(ref) between 1 and 80),
 title text not null check(char_length(title) between 3 and 120),
 city text not null check(char_length(city) between 2 and 100),
 property_type text not null check(char_length(property_type) between 2 and 60),
 price_cents bigint not null check(price_cents between 1000000 and 1000000000000),
 offer_url text not null check(char_length(offer_url) between 12 and 500),
 available boolean not null default false,
 authorization_confirmed boolean not null default false,
 reviewed_by uuid references public.eme_profiles(id) on delete set null,
 updated_at timestamptz not null default now(),
 unique(partner,ref)
);
create index if not exists eme_switch_partner_city_idx on public.eme_switch_partner_offers(city,property_type,available);
alter table public.eme_switch_partner_offers enable row level security;
revoke all on public.eme_switch_partner_offers from public,anon,authenticated,service_role;
grant select,insert,update on public.eme_switch_partner_offers to service_role;


-- Oferta comercial privada: o link só mostra um teaser sem nomes, telefone ou origem identificável.
create table if not exists public.eme_switch_deal_invites(
 id uuid primary key,
 token_hash text not null unique check(length(token_hash)=64 and translate(token_hash,'0123456789abcdef','')=''),
 public_ref text not null unique check(char_length(public_ref) between 6 and 24),
 source_kind text not null check(source_kind in ('switch_request','partner_offer')),
 source_id uuid not null,
 demand_id uuid not null references public.eme_switch_requests(id) on delete restrict,
 teaser_city text not null check(char_length(teaser_city) between 2 and 100),
 teaser_type text not null check(char_length(teaser_type) between 2 and 60),
 sale_price_cents bigint not null check(sale_price_cents between 1000000 and 1000000000000),
 brokerage_bps integer not null check(brokerage_bps between 1 and 1000),
 switch_share_bps integer not null check(switch_share_bps between 1 and 10000),
 status text not null default 'prepared' check(status in ('prepared','acknowledged','contracted','introduced','closed','paid','cancelled')),
 recipient_name text not null default '',
 recipient_business text not null default '',
 recipient_phone text not null default '',
 recipient_creci text not null default '',
 recipient_marketing_opt_in boolean not null default false,
 recipient_privacy_accepted boolean not null default false,
 acknowledged_at timestamptz,
 contract_reference text not null default '',
 license_checked boolean not null default false,
 signed_confirmed_at timestamptz,
 actual_sale_cents bigint check(actual_sale_cents between 1000000 and 1000000000000),
 received_cents bigint not null default 0 check(received_cents>=0),
 created_by uuid not null references public.eme_profiles(id),
 updated_by uuid references public.eme_profiles(id),
 version integer not null default 1 check(version>=1),
 expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint switch_invite_unique_source_demand unique(source_kind,source_id,demand_id)
);
create table if not exists public.eme_switch_deal_audit(
 id bigint generated always as identity primary key,
 deal_id uuid not null references public.eme_switch_deal_invites(id) on delete restrict,
 actor_id uuid references public.eme_profiles(id),
 old_status text,
 new_status text not null,
 created_at timestamptz not null default now()
);
create or replace function public.eme_switch_deal_audit_write()
returns trigger language plpgsql security definer set search_path='' as '
begin
 if tg_op=''UPDATE'' and new.version<>old.version+1 then raise exception ''DEAL_STALE_VERSION''; end if;
 insert into public.eme_switch_deal_audit(deal_id,actor_id,old_status,new_status)
 values(new.id,new.updated_by,case when tg_op=''INSERT'' then null else old.status end,new.status);
 return new;
end;
';
drop trigger if exists eme_switch_deal_audit_trigger on public.eme_switch_deal_invites;
create trigger eme_switch_deal_audit_trigger after insert or update on public.eme_switch_deal_invites
for each row execute function public.eme_switch_deal_audit_write();

-- Atualização atômica de interesse: o token só permite registrar ciência/interesse.
-- Não divulga partes nem equivale a assinatura de contrato.
create or replace function public.eme_switch_acknowledge(
 p_token_hash text,p_name text,p_phone text,p_creci text,p_business text,p_marketing_opt_in boolean
) returns uuid language plpgsql security invoker set search_path='' as '
declare v_id uuid;
begin
 if p_token_hash is null or length(p_token_hash)<>64 or translate(p_token_hash,''0123456789abcdef'','''')<>''''
 then raise exception ''DEAL_INVALID_TOKEN''; end if;
 update public.eme_switch_deal_invites
 set status=''acknowledged'',recipient_name=p_name,recipient_phone=p_phone,
 recipient_creci=p_creci,recipient_business=p_business,
 recipient_marketing_opt_in=p_marketing_opt_in,recipient_privacy_accepted=true,
 acknowledged_at=now(),updated_at=now(),version=version+1
 where token_hash=p_token_hash and status=''prepared'' and expires_at>now()
 returning id into v_id;
 if v_id is null then raise exception ''DEAL_NOT_AVAILABLE''; end if;
 return v_id;
end;
';
alter table public.eme_switch_deal_invites enable row level security;
alter table public.eme_switch_deal_audit enable row level security;
revoke all on public.eme_switch_deal_invites,public.eme_switch_deal_audit from public,anon,authenticated,service_role;
grant select,insert,update on public.eme_switch_deal_invites to service_role;
grant select,insert on public.eme_switch_deal_audit to service_role;
revoke all on sequence public.eme_switch_deal_audit_id_seq from public,anon,authenticated,service_role;
grant usage,select on sequence public.eme_switch_deal_audit_id_seq to service_role;
revoke all on function public.eme_switch_acknowledge(text,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.eme_switch_acknowledge(text,text,text,text,text,boolean) to service_role;


-- Profissionais que espontaneamente solicitam oportunidades. Nunca usar para listas compradas.
create table if not exists public.eme_switch_professionals(
 id uuid primary key,
 request_id uuid not null unique,
 name text not null check(char_length(name) between 3 and 100),
 business text not null default '' check(char_length(business)<=100),
 creci text not null check(char_length(creci) between 4 and 40),
 phone text not null unique check(length(phone) between 12 and 13 and phone ~ '^55[1-9]{2}9?[0-9]{8}'),
 city text not null check(char_length(city) between 2 and 100),
 property_type text not null check(char_length(property_type) between 2 and 60),
 whatsapp_opt_in boolean not null default false,
 privacy_accepted boolean not null default false,
 status text not null default 'pending' check(status in ('pending','verified','paused','rejected')),
 verified_by uuid references public.eme_profiles(id),
 verified_at timestamptz,
 optout_token_hash text not null unique check(length(optout_token_hash)=64 and translate(optout_token_hash,'0123456789abcdef','')=''),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint switch_pro_privacy check(privacy_accepted)
);
create index if not exists eme_switch_professionals_route_idx on public.eme_switch_professionals(status,city,property_type);

-- Fila preparada por sistema, não disparos em massa sem consentimento.
create table if not exists public.eme_switch_outbox(
 id uuid primary key,
 deal_id uuid not null references public.eme_switch_deal_invites(id) on delete restrict,
 professional_id uuid not null references public.eme_switch_professionals(id) on delete restrict,
 phone text not null,
 status text not null default 'pending' check(status in ('pending','sending','submitted','failed','skipped')),
 attempts integer not null default 0 check(attempts between 0 and 3),
 provider_message_id text,
 error_detail text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(deal_id,professional_id)
);
create index if not exists eme_switch_outbox_status_idx on public.eme_switch_outbox(status,created_at);
alter table public.eme_switch_professionals enable row level security;
alter table public.eme_switch_outbox enable row level security;
revoke all on public.eme_switch_professionals,public.eme_switch_outbox from public,anon,authenticated,service_role;
grant select,insert,update on public.eme_switch_professionals,public.eme_switch_outbox to service_role;

commit;
