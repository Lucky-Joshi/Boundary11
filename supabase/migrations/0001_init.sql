-- =============================================================================
-- Boundary11 — initial schema (Milestone 2)
-- =============================================================================
-- This migration mirrors the domain model used by the demo provider so the API
-- can swap providers without changing its shape. All money is stored as
-- integer paise (bigint). Run with the Supabase CLI:
--   supabase db push       (or)  supabase migration up
-- =============================================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------- enums
do $$ begin
  create type user_role as enum ('customer', 'support', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('mock_upi', 'mock_card', 'cod');
exception when duplicate_object then null; end $$;

do $$ begin
  create type coupon_type as enum ('percent', 'fixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inventory_reason as enum ('restock', 'sale', 'return', 'damage', 'correction', 'reservation', 'release');
exception when duplicate_object then null; end $$;

-- --------------------------------------------------------------- updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ------------------------------------------------------------- profiles
-- One row per auth.users record. Role drives admin access.
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role user_role not null default 'customer',
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- ------------------------------------------------------------- taxonomy
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  accent text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------- products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_description text not null default '',
  description text not null,
  category_id uuid not null references categories (id) on delete restrict,
  status product_status not null default 'draft',
  featured boolean not null default false,
  tags text[] not null default '{}',
  rating numeric(3, 2) not null default 0,
  review_count int not null default 0,
  accent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_category_idx on products (category_id);
create index if not exists products_status_idx on products (status);
create trigger products_updated before update on products
  for each row execute function set_updated_at();

create table if not exists product_collections (
  product_id uuid not null references products (id) on delete cascade,
  collection_id uuid not null references collections (id) on delete cascade,
  primary key (product_id, collection_id)
);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  url text,
  alt text not null default '',
  position int not null default 0
);
create index if not exists product_images_product_idx on product_images (product_id);

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  sku text not null unique,
  size text not null,
  color text not null,
  price_paise bigint not null check (price_paise >= 0),
  compare_at_paise bigint check (compare_at_paise >= 0),
  stock int not null default 0 check (stock >= 0),
  low_stock_threshold int not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists product_variants_product_idx on product_variants (product_id);
create trigger product_variants_updated before update on product_variants
  for each row execute function set_updated_at();

-- ------------------------------------------------------------- coupons
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type coupon_type not null,
  value bigint not null check (value > 0),
  min_subtotal_paise bigint not null default 0,
  max_discount_paise bigint,
  active boolean not null default true,
  expires_at timestamptz,
  usage_limit int,
  used_count int not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------- orders
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references profiles (id) on delete set null,
  customer_name text not null,
  contact_email text not null,
  contact_phone text not null default '',
  shipping_address jsonb not null,
  subtotal_paise bigint not null check (subtotal_paise >= 0),
  discount_paise bigint not null default 0 check (discount_paise >= 0),
  shipping_paise bigint not null default 0 check (shipping_paise >= 0),
  total_paise bigint not null check (total_paise >= 0),
  coupon_code text,
  status order_status not null default 'pending',
  payment_status payment_status not null default 'pending',
  payment_method payment_method not null default 'mock_upi',
  payment_ref text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on orders (user_id);
create index if not exists orders_status_idx on orders (status);
create index if not exists orders_created_idx on orders (created_at desc);
create trigger orders_updated before update on orders
  for each row execute function set_updated_at();

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  variant_id uuid references product_variants (id) on delete set null,
  name text not null,
  slug text not null,
  sku text not null,
  size text not null,
  color text not null,
  unit_price_paise bigint not null check (unit_price_paise >= 0),
  quantity int not null check (quantity > 0)
);
create index if not exists order_items_order_idx on order_items (order_id);

create table if not exists order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  status order_status not null,
  note text not null default '',
  actor text not null default 'system',
  created_at timestamptz not null default now()
);
create index if not exists order_status_history_order_idx on order_status_history (order_id);

-- ------------------------------------------------------------- inventory
create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  delta int not null,
  reason inventory_reason not null,
  note text not null default '',
  actor text not null default 'system',
  balance_after int not null,
  created_at timestamptz not null default now()
);
create index if not exists inventory_movements_variant_idx on inventory_movements (variant_id);

-- ------------------------------------------------------------- content
create table if not exists banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text not null default '',
  cta_label text not null default '',
  cta_href text not null default '',
  accent text,
  active boolean not null default true,
  "order" int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null default 'system',
  action text not null,
  entity text not null,
  entity_id text,
  detail text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on audit_logs (created_at desc);

-- ------------------------------------------------------------- cart
create table if not exists carts (
  id text primary key,
  user_id uuid references profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists cart_items (
  cart_id text not null references carts (id) on delete cascade,
  variant_id uuid not null references product_variants (id) on delete cascade,
  quantity int not null check (quantity between 1 and 10),
  primary key (cart_id, variant_id)
);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table profiles enable row level security;
alter table categories enable row level security;
alter table collections enable row level security;
alter table products enable row level security;
alter table product_collections enable row level security;
alter table product_images enable row level security;
alter table product_variants enable row level security;
alter table coupons enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_history enable row level security;
alter table inventory_movements enable row level security;
alter table banners enable row level security;
alter table settings enable row level security;
alter table audit_logs enable row level security;
alter table carts enable row level security;
alter table cart_items enable row level security;

-- Helper: is the current user staff?
create or replace function is_staff()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role in ('support', 'admin')
  );
$$;

-- Helper: is the current user an admin?
create or replace function is_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Public (anon + authenticated) read access to the live catalog.
drop policy if exists categories_read on categories;
create policy categories_read on categories for select using (true);

drop policy if exists collections_read on collections;
create policy collections_read on collections for select using (true);

drop policy if exists products_read on products;
create policy products_read on products for select using (status = 'published' or is_staff());

drop policy if exists product_images_read on product_images;
create policy product_images_read on product_images for select using (true);

drop policy if exists product_variants_read on product_variants;
create policy product_variants_read on product_variants for select using (true);

drop policy if exists product_collections_read on product_collections;
create policy product_collections_read on product_collections for select using (true);

drop policy if exists banners_read on banners;
create policy banners_read on banners for select using (active or is_staff());

drop policy if exists settings_read on settings;
create policy settings_read on settings for select using (true);

-- Profiles: a customer sees only themselves; staff see everyone.
drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles for select using (id = auth.uid() or is_staff());

drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles for update using (id = auth.uid());

-- Orders: customers read their own; staff read and write all.
drop policy if exists orders_read on orders;
create policy orders_read on orders for select using (user_id = auth.uid() or is_staff());

drop policy if exists orders_staff_write on orders;
create policy orders_staff_write on orders for all using (is_staff()) with check (is_staff());

drop policy if exists order_items_read on order_items;
create policy order_items_read on order_items for select using (
  is_staff() or exists (select 1 from orders o where o.id = order_items.order_id and o.user_id = auth.uid())
);

drop policy if exists order_history_read on order_status_history;
create policy order_history_read on order_status_history for select using (
  is_staff() or exists (select 1 from orders o where o.id = order_status_history.order_id and o.user_id = auth.uid())
);

-- Carts are keyed by a client-generated id; customers own their own rows.
drop policy if exists carts_own on carts;
create policy carts_own on carts for all using (true) with check (true);

drop policy if exists cart_items_own on cart_items;
create policy cart_items_own on cart_items for all using (true) with check (true);

-- Admin-only tables.
drop policy if exists coupons_staff on coupons;
create policy coupons_staff on coupons for all using (is_staff()) with check (is_staff());

drop policy if exists inventory_staff on inventory_movements;
create policy inventory_staff on inventory_movements for all using (is_staff()) with check (is_staff());

drop policy if exists audit_admin on audit_logs;
create policy audit_admin on audit_logs for all using (is_admin()) with check (is_admin());

-- Writes to the catalog are admin-only.
drop policy if exists products_admin_write on products;
create policy products_admin_write on products for all using (is_admin()) with check (is_admin());

drop policy if exists variants_admin_write on product_variants;
create policy variants_admin_write on product_variants for all using (is_admin()) with check (is_admin());

drop policy if exists images_admin_write on product_images;
create policy images_admin_write on product_images for all using (is_admin()) with check (is_admin());

drop policy if exists collections_admin_write on collections;
create policy collections_admin_write on collections for all using (is_admin()) with check (is_admin());

drop policy if exists categories_admin_write on categories;
create policy categories_admin_write on categories for all using (is_admin()) with check (is_admin());

drop policy if exists banners_admin_write on banners;
create policy banners_admin_write on banners for all using (is_admin()) with check (is_admin());
