-- NOVEX STORE: run this entire file in Supabase SQL Editor.
-- Before running: create the owner's account in Supabase Authentication > Users.
-- Owner UUID is configured for this project.
-- Never put a service_role key in config.js or any browser file.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 3000),
  price numeric(12,2) not null check (price >= 0),
  image_url text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "Anyone can view published products" on public.products;
create policy "Anyone can view published products"
on public.products for select
to anon, authenticated
using (published = true);

drop policy if exists "Owner can view all products" on public.products;
create policy "Owner can view all products"
on public.products for select
to authenticated
using (auth.uid() = 'd912cad9-5904-40f1-9c39-7ad166bb54c8'::uuid);

drop policy if exists "Owner can insert products" on public.products;
create policy "Owner can insert products"
on public.products for insert
to authenticated
with check (auth.uid() = 'd912cad9-5904-40f1-9c39-7ad166bb54c8'::uuid);

drop policy if exists "Owner can update products" on public.products;
create policy "Owner can update products"
on public.products for update
to authenticated
using (auth.uid() = 'd912cad9-5904-40f1-9c39-7ad166bb54c8'::uuid)
with check (auth.uid() = 'd912cad9-5904-40f1-9c39-7ad166bb54c8'::uuid);

drop policy if exists "Owner can delete products" on public.products;
create policy "Owner can delete products"
on public.products for delete
to authenticated
using (auth.uid() = 'd912cad9-5904-40f1-9c39-7ad166bb54c8'::uuid);

-- Storage bucket for product photos. Public read is needed for visitors.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('products', 'products', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public can view product photos" on storage.objects;
create policy "Public can view product photos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'products');

drop policy if exists "Owner can upload product photos" on storage.objects;
create policy "Owner can upload product photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'products' and auth.uid() = 'd912cad9-5904-40f1-9c39-7ad166bb54c8'::uuid);

drop policy if exists "Owner can update product photos" on storage.objects;
create policy "Owner can update product photos"
on storage.objects for update
to authenticated
using (bucket_id = 'products' and auth.uid() = 'd912cad9-5904-40f1-9c39-7ad166bb54c8'::uuid)
with check (bucket_id = 'products' and auth.uid() = 'd912cad9-5904-40f1-9c39-7ad166bb54c8'::uuid);

drop policy if exists "Owner can delete product photos" on storage.objects;
create policy "Owner can delete product photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'products' and auth.uid() = 'd912cad9-5904-40f1-9c39-7ad166bb54c8'::uuid);
