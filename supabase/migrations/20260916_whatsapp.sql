-- EME: execute uma vez, antes de habilitar o recebimento na Meta.
begin;
do $$ begin
  if to_regclass('public.eme_operations_state') is null then
    raise exception 'Ative as operações da EME antes do WhatsApp.';
  end if;
end $$;
create table public.eme_whatsapp_events (
 event_key text primary key check(event_key ~ '^[a-f0-9]{64}$'),
 kind text not null check(kind in ('message','status','notification')),
 message_id text not null check(length(message_id)<=300),
 phone_number_id text not null check(phone_number_id ~ '^[0-9]{5,30}$'),
 contact_phone text not null check(length(contact_phone)<=32),
 occurred_at timestamptz not null,
 received_at timestamptz not null default now(),
 data jsonb not null check(jsonb_typeof(data)='object' and octet_length(data::text)<30000)
);
create index eme_whatsapp_events_received on public.eme_whatsapp_events(received_at desc);
alter table public.eme_whatsapp_events enable row level security;
revoke all on public.eme_whatsapp_events from public,anon,authenticated,service_role;
grant select,insert on public.eme_whatsapp_events to service_role;
commit;
