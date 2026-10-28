-- M Switch — piloto independente da operação atual.
-- Aplique no Supabase antes de publicar frontend/API. Não altera leads, inventário ou pagamentos.
begin;
create table if not exists public.eme_switch_requests (
  id uuid primary key,
  request_id uuid not null unique,
  kind text not null check(kind in ('sell','swap','invest')),
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
    kind <> 'invest' or (not ownership_reviewed and not sharing_authorized and min_acceptable_cents is null)
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

commit;
