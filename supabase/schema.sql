create extension if not exists pgcrypto;

drop table if exists public.products cascade;
drop table if exists public.site_config cascade;

create table public.products (
  id text primary key,
  name text not null,
  category text not null,
  description text not null,
  presentation text not null,
  price integer not null check (price >= 0),
  featured boolean not null default false,
  image text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.site_config (
  id integer primary key default 1 check (id = 1),
  business_name text not null,
  whatsapp_number text not null,
  tagline text not null,
  delivery_zone text not null,
  payment_methods text not null,
  min_order integer not null default 0 check (min_order >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.products enable row level security;
alter table public.site_config enable row level security;

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

insert into public.site_config (
  id,
  business_name,
  whatsapp_number,
  tagline,
  delivery_zone,
  payment_methods,
  min_order
)
values (
  1,
  'Ciudad Evita Distribuciones',
  '5491132465579',
  'Catalogo digital para pedidos rapidos por WhatsApp.',
  'Ciudad Evita y alrededores',
  'Transferencia, efectivo o Mercado Pago',
  0
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
  );

alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.site_config;
