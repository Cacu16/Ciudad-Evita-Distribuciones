create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'app_role'
  ) then
    create type public.app_role as enum ('ADMIN', 'USER');
  end if;
end
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end
$$;

create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null,
  description text not null,
  presentation text not null,
  price integer not null check (price >= 0),
  featured boolean not null default false,
  image text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.products
  add column if not exists featured boolean not null default false,
  add column if not exists image text,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.site_config (
  id integer primary key default 1 check (id = 1),
  business_name text not null,
  whatsapp_number text not null,
  tagline text not null,
  delivery_zone text not null,
  payment_methods text not null,
  min_order integer not null default 0 check (min_order >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.app_role not null default 'USER',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists role public.app_role not null default 'USER',
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.profiles
set email = concat(id::text, '@pending.local')
where email is null;

alter table public.profiles
  alter column email set not null;

create index if not exists products_category_idx on public.products (category);
create index if not exists products_featured_idx on public.products (featured);
create index if not exists products_updated_at_idx on public.products (updated_at desc);
create unique index if not exists profiles_email_idx on public.profiles (email);

alter table public.products enable row level security;
alter table public.site_config enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Public can read products" on public.products;
create policy "Public can read products"
on public.products
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated can manage products" on public.products;
create policy "Authenticated can manage products"
on public.products
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read site config" on public.site_config;
create policy "Public can read site config"
on public.site_config
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated can manage site config" on public.site_config;
create policy "Authenticated can manage site config"
on public.site_config
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, concat(new.id::text, '@pending.local')),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'USER'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      updated_at = timezone('utc', now());

  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();

insert into public.profiles (id, email, full_name, role)
select
  users.id,
  coalesce(users.email, concat(users.id::text, '@pending.local')),
  coalesce(users.raw_user_meta_data ->> 'full_name', ''),
  coalesce(profiles.role, 'USER'::public.app_role)
from auth.users as users
left join public.profiles as profiles
  on profiles.id = users.id
on conflict (id) do update
set email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    updated_at = timezone('utc', now());

insert into public.site_config (
  id,
  business_name,
  whatsapp_number,
  tagline,
  delivery_zone,
  payment_methods,
  min_order
)
select
  1,
  'Ciudad Evita Distribuciones',
  '5491132465579',
  'Catalogo digital para pedidos rapidos por WhatsApp.',
  'Ciudad Evita y alrededores',
  'Transferencia, efectivo o Mercado Pago',
  0
where not exists (
  select 1
  from public.site_config
  where id = 1
);

insert into public.products (
  id,
  name,
  category,
  description,
  presentation,
  price,
  featured,
  image
)
select *
from (
  values
    (
      'yerba-canarias',
      'Yerba Canarias',
      'Almacen',
      'Sabor intenso, ideal para reposicion rapida en kioscos y despensas.',
      '1 kg',
      7800,
      true,
      null
    ),
    (
      'aceite-natura',
      'Aceite Natura',
      'Almacen',
      'Botella pet con salida practica para uso diario.',
      '900 ml',
      3100,
      false,
      null
    ),
    (
      'lavandina-ayudin',
      'Lavandina Ayudin',
      'Limpieza',
      'Desinfeccion y limpieza general para el hogar y comercio.',
      '2 l',
      1850,
      true,
      null
    ),
    (
      'detergente-magistral',
      'Detergente Magistral',
      'Limpieza',
      'Rinde mucho y funciona bien para reposicion en volumen.',
      '750 ml',
      2100,
      false,
      null
    ),
    (
      'gaseosa-coca',
      'Coca-Cola',
      'Bebidas',
      'Presentacion familiar para almacenes y autoservicios.',
      '2.25 l',
      2950,
      true,
      null
    ),
    (
      'agua-villa-del-sur',
      'Agua Villa del Sur',
      'Bebidas',
      'Agua sin gas con alta rotacion para pedidos mixtos.',
      '1.5 l',
      1250,
      false,
      null
    )
) as seed (id, name, category, description, presentation, price, featured, image)
where not exists (
  select 1
  from public.products
  limit 1
);

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
before update on public.products
for each row execute procedure public.touch_updated_at();

drop trigger if exists site_config_touch_updated_at on public.site_config;
create trigger site_config_touch_updated_at
before update on public.site_config
for each row execute procedure public.touch_updated_at();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute procedure public.touch_updated_at();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'site_config'
  ) then
    alter publication supabase_realtime add table public.site_config;
  end if;
end
$$;

-- Para volver admin a un usuario ya creado:
-- update public.profiles set role = 'ADMIN' where email = 'tu-admin@dominio.com';
