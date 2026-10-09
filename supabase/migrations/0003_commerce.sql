-- =============================================================================
-- Boundary11 — commerce schema (Milestone 4)
-- =============================================================================
-- Adds:
--   * user_roles            locked mirror of profiles.role (privilege reads),
--                           with column locks so customers can never promote
--                           themselves or edit their own status.
--   * addresses             customer saved shipping addresses.
--   * payments              per-order payment attempts (prepared for a real
--                           gateway; the mock writes 'captured' rows).
--   * orders.idempotency_key / orders.stock_released for safe retry of
--                           checkout and stock release on cancellation.
--   * release_order_stock() atomic, idempotent stock-release RPC.
-- It also closes the Milestone-2 security gap where profiles_self_update let
-- a customer change their own role/status.
--   supabase db push   (or)  supabase migration up
-- =============================================================================

-- ------------------------------------------------------------------- enums
do $$ begin
  create type payment_attempt_status as enum ('created', 'authorized', 'captured', 'failed', 'refunded', 'cancelled');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------ user_roles
-- Mirror of profiles.role maintained by triggers. Privilege checks read this
-- table instead of profiles so role identity lives somewhere a caller can
-- never write directly. Customers get no write policies on it at all.
create table if not exists user_roles (
  user_id uuid primary key references profiles (id) on delete cascade,
  role user_role not null default 'customer',
  updated_at timestamptz not null default now()
);

alter table user_roles enable row level security;

-- Keep the mirror in sync with profiles.role (the source of truth, updated
-- only by staff via the service role). Security definer so customers editing
-- their own profile fields do not trip over the mirror write.
create or replace function sync_user_roles()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from user_roles where user_id = old.id;
  else
    insert into user_roles (user_id, role) values (new.id, new.role)
    on conflict (user_id) do update set role = excluded.role, updated_at = now();
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists profiles_sync_user_roles on profiles;
create trigger profiles_sync_user_roles after insert or update or delete on profiles
  for each row execute function sync_user_roles();

-- Any account created through Supabase Auth starts life as a customer; the
-- server/seed then attaches the real role via profiles.
create or replace function b11_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into user_roles (user_id, role) values (new.id, 'customer')
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists b11_auth_user_created on auth.users;
create trigger b11_auth_user_created after insert on auth.users
  for each row execute function b11_handle_new_user();

-- Backfill existing profiles into the mirror.
insert into user_roles (user_id, role)
select id, role from profiles
on conflict (user_id) do nothing;

-- Privilege helpers now read the locked mirror.
create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid() and ur.role in ('support', 'admin')
  );
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  );
$$;

-- RLS on the mirror: read-only, self + staff. No write policies exist.
drop policy if exists user_roles_read on user_roles;
create policy user_roles_read on user_roles for select
  using (user_id = auth.uid() or is_staff());

-- ------------------------------------------------------------------ gaps
-- Close the privilege-escalation gap: customers may update only their own
-- non-privilege columns. role/status are staff-only (service role).
drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

revoke update on profiles from authenticated;
grant update (full_name, email) on profiles to authenticated;

-- ------------------------------------------------------------ addresses
create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text not null default '',
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'India',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists addresses_user_idx on addresses (user_id);
create trigger addresses_updated before update on addresses
  for each row execute function set_updated_at();

alter table addresses enable row level security;

drop policy if exists addresses_own on addresses;
create policy addresses_own on addresses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists addresses_staff on addresses;
create policy addresses_staff on addresses for select using (is_staff());

-- ------------------------------------------------------------ payments
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  provider text not null default 'mock',
  method text not null,
  reference text,
  amount_paise bigint not null check (amount_paise >= 0),
  currency text not null default 'INR',
  status payment_attempt_status not null default 'created',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_order_idx on payments (order_id);
-- One captured transaction per provider reference.
create unique index if not exists payments_provider_reference_unique
  on payments (provider, reference) where reference is not null;
create trigger payments_updated before update on payments
  for each row execute function set_updated_at();

alter table payments enable row level security;

drop policy if exists payments_staff on payments;
create policy payments_staff on payments for all using (is_staff()) with check (is_staff());

drop policy if exists payments_order_read on payments;
create policy payments_order_read on payments for select using (
  is_staff() or exists (
    select 1 from orders o where o.id = payments.order_id and o.user_id = auth.uid()
  )
);

-- ------------------------------------------------- orders (idempotency)
alter table orders add column if not exists idempotency_key text;
alter table orders add column if not exists stock_released boolean not null default false;
create unique index if not exists orders_idempotency_key_unique
  on orders (idempotency_key) where idempotency_key is not null;

-- =============================================================================
-- release_order_stock(p_order_id, p_actor)
-- Idempotent, atomic stock release. Guards on orders.stock_released: a second
-- call is a no-op. Restores every line's stock, records movements, a history
-- entry and an audit log in one transaction. Used by cancellation workflows.
-- =============================================================================
create or replace function release_order_stock(p_order_id uuid, p_actor text default 'system')
returns void language plpgsql security definer set search_path = public as $$
declare
  o record;
  v record;
begin
  select * into o from orders where id = p_order_id for update;
  if o.id is null then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if o.stock_released then
    return;
  end if;

  for v in
    select oi.variant_id, oi.product_id, oi.quantity
    from order_items oi
    where oi.order_id = p_order_id
  loop
    if v.variant_id is not null then
      update product_variants
        set stock = stock + v.quantity, updated_at = now()
        where id = v.variant_id;

      insert into inventory_movements (variant_id, product_id, delta, reason, note, actor, balance_after)
      values (
        v.variant_id,
        v.product_id,
        v.quantity,
        'release',
        'Released stock from ' || o.order_number,
        coalesce(p_actor, 'system'),
        (select stock from product_variants where id = v.variant_id)
      );
    end if;
  end loop;

  update orders set stock_released = true, updated_at = now() where id = p_order_id;

  insert into order_status_history (order_id, status, note, actor)
  values (p_order_id, o.status, 'Reserved inventory released', coalesce(p_actor, 'system'));

  insert into audit_logs (actor, action, entity, entity_id, detail)
  values (coalesce(p_actor, 'system'), 'inventory.release', 'order', p_order_id::text, o.order_number);
end $$;