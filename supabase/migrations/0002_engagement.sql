-- =============================================================================
-- Boundary11 — engagement schema (Milestone 3)
-- =============================================================================
-- Adds customer product reviews, inbound contact messages and newsletter
-- subscribers. Mirrors the in-memory demo provider so both providers expose
-- the same shape to the API. Money is not involved here.
--   supabase db push   (or)  supabase migration up
-- =============================================================================

-- ------------------------------------------------------------------- enums
do $$ begin
  create type review_status as enum ('published', 'pending', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contact_status as enum ('new', 'read', 'resolved');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------- reviews
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  user_id uuid references profiles (id) on delete set null,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  title text not null default '',
  body text not null,
  status review_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reviews_product_idx on reviews (product_id);
create index if not exists reviews_status_idx on reviews (status);
create trigger reviews_updated before update on reviews
  for each row execute function set_updated_at();

-- ------------------------------------------------------- contact messages
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status contact_status not null default 'new',
  created_at timestamptz not null default now()
);
create index if not exists contact_messages_created_idx on contact_messages (created_at desc);

-- -------------------------------------------------- newsletter subscribers
create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table reviews enable row level security;
alter table contact_messages enable row level security;
alter table newsletter_subscribers enable row level security;

-- Reviews: anyone may read published reviews; signed-in users write their own;
-- staff can moderate everything.
drop policy if exists reviews_read on reviews;
create policy reviews_read on reviews for select using (status = 'published' or is_staff());

drop policy if exists reviews_insert_own on reviews;
create policy reviews_insert_own on reviews for insert with check (user_id = auth.uid());

drop policy if exists reviews_staff_write on reviews;
create policy reviews_staff_write on reviews for all using (is_staff()) with check (is_staff());

-- Contact messages: anyone may submit; only staff may read or update them.
drop policy if exists contact_insert on contact_messages;
create policy contact_insert on contact_messages for insert with check (true);

drop policy if exists contact_staff on contact_messages;
create policy contact_staff on contact_messages for all using (is_staff()) with check (is_staff());

-- Newsletter: anyone may subscribe; only staff may read the list.
drop policy if exists newsletter_insert on newsletter_subscribers;
create policy newsletter_insert on newsletter_subscribers for insert with check (true);

drop policy if exists newsletter_staff on newsletter_subscribers;
create policy newsletter_staff on newsletter_subscribers for all using (is_staff()) with check (is_staff());
