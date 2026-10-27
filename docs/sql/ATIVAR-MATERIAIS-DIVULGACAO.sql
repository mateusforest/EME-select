-- Materiais privados da equipe. Não altera imóveis, leads nem acessos existentes.
begin;
create table if not exists public.eme_marketing_materials (
 id uuid primary key,
 version integer not null default 1 check(version>0),
 title text not null check(char_length(title) between 2 and 160),
 category text not null check(category in ('Criativo','Vídeo','Apresentação','Expositor','Institucional','Outros')),
 notes text not null default '' check(char_length(notes)<=2000),
 property_id uuid references public.eme_cases(id),
 broker_id uuid references public.eme_profiles(id),
 filename text not null check(char_length(filename) between 1 and 180),
 mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/quicktime','video/webm','application/zip')),
 size_bytes bigint not null check(size_bytes between 1 and 52428800),
 object_path text not null unique,
 status text not null default 'uploading' check(status in ('uploading','ready')),
 archived boolean not null default false,
 created_by uuid not null references public.eme_profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists eme_materials_property on public.eme_marketing_materials(property_id,created_at desc);
create index if not exists eme_materials_broker on public.eme_marketing_materials(broker_id,created_at desc);
alter table public.eme_marketing_materials enable row level security;
revoke all on public.eme_marketing_materials from public,anon,authenticated;
grant select,insert,update on public.eme_marketing_materials to service_role;
-- Vídeos são enviados diretamente ao bucket por uma autorização temporária.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('eme-marketing-materials','eme-marketing-materials',false,52428800,array['image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/quicktime','video/webm','application/zip'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- Mesmo políticas permissivas de outros buckets não abrem estes arquivos.
drop policy if exists eme_materials_server_only on storage.objects;
create policy eme_materials_server_only on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id <> 'eme-marketing-materials') with check(bucket_id <> 'eme-marketing-materials');
notify pgrst,'reload schema';
commit;
