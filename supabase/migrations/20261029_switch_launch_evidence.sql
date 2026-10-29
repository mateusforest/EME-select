-- Additive extension in the EXISTING M Select database. No new project/database.
-- Run after 20261028_switch_pilot.sql. Existing records retain unknown evidence (NULL).
begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';

alter table public.eme_switch_requests
  add column if not exists consent_version text,
  add column if not exists consent_recorded_at timestamptz,
  add column if not exists demand_reviewed boolean not null default false;
alter table public.eme_switch_professionals
  add column if not exists consent_version text,
  add column if not exists consent_recorded_at timestamptz,
  add column if not exists version bigint not null default 1;
alter table public.eme_switch_deal_invites
  add column if not exists closing_reference text,
  add column if not exists payment_reference text;

create table if not exists public.eme_switch_consent_events (
  id bigint generated always as identity primary key,
  subject_table text not null check(subject_table in ('eme_switch_requests','eme_switch_professionals')),
  subject_id uuid not null,
  event text not null check(event in ('captured','changed')),
  consent_version text,
  purposes jsonb not null,
  source text not null,
  recorded_at timestamptz not null default now()
);
create index if not exists eme_switch_consent_subject_idx
  on public.eme_switch_consent_events(subject_table,subject_id,recorded_at);
alter table public.eme_switch_consent_events enable row level security;
revoke all on public.eme_switch_consent_events from public,anon,authenticated,service_role;
grant select on public.eme_switch_consent_events to service_role;
revoke all on sequence public.eme_switch_consent_events_id_seq from public,anon,authenticated,service_role;

create or replace function public.eme_switch_capture_consent()
returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb := to_jsonb(new); prior jsonb; purposes jsonb; old_purposes jsonb;
begin
  if tg_op='UPDATE' then
    prior := to_jsonb(old);
    if new.consent_version is distinct from old.consent_version or
       new.consent_recorded_at is distinct from old.consent_recorded_at then
      raise exception 'SWITCH_CONSENT_RECEIPT_IMMUTABLE';
    end if;
  end if;
  if tg_table_name='eme_switch_requests' then
    purposes := jsonb_build_object('privacy',payload->'privacy_accepted','response_whatsapp',payload->'contact_opt_in','opportunities_whatsapp',payload->'updates_opt_in');
    old_purposes := jsonb_build_object('privacy',prior->'privacy_accepted','response_whatsapp',prior->'contact_opt_in','opportunities_whatsapp',prior->'updates_opt_in');
  else
    purposes := jsonb_build_object('privacy',payload->'privacy_accepted','opportunities_whatsapp',payload->'whatsapp_opt_in');
    old_purposes := jsonb_build_object('privacy',prior->'privacy_accepted','opportunities_whatsapp',prior->'whatsapp_opt_in');
  end if;
  if tg_op='INSERT' or purposes is distinct from old_purposes then
    insert into public.eme_switch_consent_events(subject_table,subject_id,event,consent_version,purposes,source)
    values(tg_table_name,new.id,case when tg_op='INSERT' then 'captured' else 'changed' end,
      new.consent_version,purposes,coalesce(payload->>'source','switch-professionals-web'));
  end if;
  return new;
end;
$$;
-- Only module triggers are replaced; no existing M Select objects are changed.
drop trigger if exists eme_switch_consent_capture on public.eme_switch_requests;
create trigger eme_switch_consent_capture after insert or update on public.eme_switch_requests
  for each row execute function public.eme_switch_capture_consent();
drop trigger if exists eme_switch_consent_capture on public.eme_switch_professionals;
create trigger eme_switch_consent_capture after insert or update on public.eme_switch_professionals
  for each row execute function public.eme_switch_capture_consent();
revoke all on function public.eme_switch_capture_consent() from public,anon,authenticated,service_role;
revoke all on function public.eme_switch_record_change(), public.eme_switch_deal_audit_write() from public,anon,authenticated,service_role;

create or replace function public.eme_switch_validate_deal_evidence()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.status=old.status then return new; end if;
  if not ((old.status='prepared' and new.status='acknowledged') or
          (old.status='acknowledged' and new.status='contracted') or
          (old.status='contracted' and new.status='introduced') or
          (old.status='introduced' and new.status='closed') or
          (old.status='closed' and new.status='paid') or
          (old.status not in ('paid','cancelled') and new.status='cancelled')) then
    raise exception 'SWITCH_DEAL_STAGE_INVALID';
  end if;
  if new.status in ('contracted','introduced','closed','paid') and
     (not new.license_checked or new.signed_confirmed_at is null or length(trim(new.contract_reference))<8) then
    raise exception 'SWITCH_CONTRACT_EVIDENCE_REQUIRED';
  end if;
  if new.status in ('closed','paid') and
     (new.actual_sale_cents is null or coalesce(length(trim(new.closing_reference)),0) not between 8 and 160) then
    raise exception 'SWITCH_CLOSING_EVIDENCE_REQUIRED';
  end if;
  if new.status='paid' and (coalesce(length(trim(new.payment_reference)),0) not between 8 and 160 or
     new.received_cents<=0 or new.received_cents<>round(round(new.actual_sale_cents::numeric*new.brokerage_bps/10000)*new.switch_share_bps/10000)) then
    raise exception 'SWITCH_PAYMENT_EVIDENCE_REQUIRED';
  end if;
  return new;
end;
$$;
drop trigger if exists eme_switch_deal_evidence on public.eme_switch_deal_invites;
create trigger eme_switch_deal_evidence before update on public.eme_switch_deal_invites
  for each row execute function public.eme_switch_validate_deal_evidence();
revoke all on function public.eme_switch_validate_deal_evidence() from public,anon,authenticated,service_role;
commit;
