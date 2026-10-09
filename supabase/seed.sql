-- =============================================================================
-- Boundary11 — demo seed data
-- =============================================================================
-- Original, brand-safe demo content. No cricket board marks, national team
-- crests or player likenesses. Money is integer paise. Safe to re-run.
--   supabase db reset   (applies migrations, then this seed)
-- =============================================================================

-- ----------------------------------------------------------- staff accounts
-- Demo auth users. Passwords are prototype-only and must never be real.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@boundary11.example', crypt('admin12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Aarav Mehta"}', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'support@boundary11.example', crypt('support123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Meera Nair"}', now(), now()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fan@boundary11.example', crypt('customer123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rohan Desai"}', now(), now()),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'priya@example.com', crypt('priya12345', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Sharma"}', now(), now())
on conflict (id) do nothing;

insert into profiles (id, email, full_name, role, status) values
  ('00000000-0000-0000-0000-000000000001', 'admin@boundary11.example', 'Aarav Mehta', 'admin', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'support@boundary11.example', 'Meera Nair', 'support', 'active'),
  ('00000000-0000-0000-0000-000000000003', 'fan@boundary11.example', 'Rohan Desai', 'customer', 'active'),
  ('00000000-0000-0000-0000-000000000004', 'priya@example.com', 'Priya Sharma', 'customer', 'active')
on conflict (id) do nothing;

-- ----------------------------------------------------------- taxonomy
insert into categories (slug, name, description, display_order) values
  ('jerseys', 'Jerseys', 'Matchday and supporter jerseys built for the stands.', 1),
  ('training', 'Training', 'Performance tees and drill-ready layers.', 2),
  ('hoodies', 'Hoodies & Outerwear', 'Warm layers for early nets and late finishes.', 3),
  ('caps', 'Caps & Headwear', 'Caps and beanies for every session.', 4),
  ('bags', 'Bags', 'Kit bags and backpacks that carry the lot.', 5),
  ('accessories', 'Accessories', 'Grips, bands, bottles and matchday extras.', 6)
on conflict (slug) do nothing;

insert into collections (slug, name, description, accent) values
  ('matchday', 'Matchday', 'Wear the colours from the first ball to the last.', '#1d2b53'),
  ('training-camp', 'Training Camp', 'Drill-ready performance gear for the practice grind.', '#0d9488'),
  ('fan-favourites', 'Fan Favourites', 'The pieces supporters keep coming back to.', '#2563eb'),
  ('new-season', 'New Season', 'Fresh drops for the season ahead.', '#f59e0b')
on conflict (slug) do nothing;

-- ----------------------------------------------------------- products
with inserted as (
  insert into products (slug, name, short_description, description, category_id, status, featured, tags, rating, review_count, accent)
  values
    ('matchday-home-jersey', 'Boundary11 Matchday Home Jersey',
     'The flagship home jersey in deep navy with an electric-blue side panel.',
     'Our flagship home jersey, cut from a lightweight recycled performance knit that moves with you through a full day in the stands. Moisture-wicking, quick-drying and built to survive the wash after every match.',
     (select id from categories where slug = 'jerseys'), 'published', true, '{jersey,matchday,home}', 4.7, 214, '#1d2b53'),
    ('matchday-away-jersey', 'Boundary11 Matchday Away Jersey',
     'A crisp away jersey in off-white with saffron detailing.',
     'The away counterpart to our home kit: a clean off-white base with saffron trim and a breathable mesh back panel for long days under the sun.',
     (select id from categories where slug = 'jerseys'), 'published', true, '{jersey,matchday,away}', 4.6, 168, '#f59e0b'),
    ('cover-drive-training-tee', 'Cover Drive Training Tee',
     'A featherweight training tee that keeps you cool through long nets.',
     'A featherweight training tee with laser-cut ventilation where you need it most. Designed for high-rep sessions and repeated washes.',
     (select id from categories where slug = 'training'), 'published', false, '{training,tee}', 4.5, 96, '#0d9488'),
    ('deep-midwicket-hoodie', 'Deep Midwicket Hoodie',
     'A heavyweight fleece hoodie for cold mornings and late finishes.',
     'A heavyweight brushed-fleece hoodie with a relaxed cut, kangaroo pocket and ribbed cuffs, built for the walk to the ground and every cold finish after.',
     (select id from categories where slug = 'hoodies'), 'published', true, '{hoodie,outerwear}', 4.8, 142, '#1d2b53'),
    ('boundary11-kit-bag-backpack', 'Boundary11 Kit Bag Backpack',
     'A 35L backpack with a separate bat sleeve and wet kit compartment.',
     'A 35L backpack with a padded bat sleeve, a ventilated boot compartment and a roll-top main section that swallows a full kit without complaint.',
     (select id from categories where slug = 'bags'), 'published', false, '{bag,backpack}', 4.4, 61, '#2563eb'),
    ('sunset-sixer-cap', 'Sunset Sixer Cap',
     'A structured performance cap with a moisture-wicking sweatband.',
     'A structured six-panel performance cap with an embroidered mark, curved brim and moisture-wicking sweatband for long days in the field.',
     (select id from categories where slug = 'caps'), 'published', false, '{cap,headwear}', 4.3, 88, '#f59e0b'),
    ('boundary11-wristband-pack', 'Boundary11 Wristband Pack',
     'A three-pack of sweat bands in the Boundary11 palette.',
     'A three-pack of soft terry sweat bands — one navy, one saffron, one white — to keep the sweat out of your eyes when it matters.',
     (select id from categories where slug = 'accessories'), 'published', false, '{accessory,wristband}', 4.2, 40, '#0d9488'),
    ('heritage-retro-jersey', 'Heritage Retro Jersey',
     'A limited retro-inspired polo-collar jersey in cream and navy.',
     'A limited retro-inspired jersey with a polo collar, cream body and navy twin-tipping, celebrating the club look of a bygone era.',
     (select id from categories where slug = 'jerseys'), 'draft', false, '{jersey,retro,limited}', 0, 0, '#1d2b53'),
    ('team-travel-hoodie', 'Team Travel Hoodie',
     'A zip-through travel hoodie with a subtle tonal crest.',
     'A zip-through travel hoodie in a technical bonded fabric with a subtle tonal crest and zip pockets sized for the trip and the turf.',
     (select id from categories where slug = 'hoodies'), 'published', false, '{hoodie,travel}', 4.5, 54, '#2563eb'),
    ('classic-field-cap', 'Classic Field Cap',
     'A relaxed six-panel cap in washed navy cotton.',
     'A relaxed six-panel cap in washed navy cotton with a soft crown and a curved brim — an easy everyday finish to any kit.',
     (select id from categories where slug = 'caps'), 'published', false, '{cap,classic}', 4.4, 73, '#1d2b53')
  returning id, slug
)
insert into product_collections (product_id, collection_id)
select i.id, c.id
from inserted i
join (values
  ('matchday-home-jersey', 'matchday'), ('matchday-home-jersey', 'new-season'),
  ('matchday-away-jersey', 'matchday'),
  ('cover-drive-training-tee', 'training-camp'),
  ('deep-midwicket-hoodie', 'fan-favourites'),
  ('boundary11-kit-bag-backpack', 'training-camp'),
  ('sunset-sixer-cap', 'fan-favourites'),
  ('heritage-retro-jersey', 'new-season'),
  ('team-travel-hoodie', 'new-season'),
  ('classic-field-cap', 'fan-favourites')
) as m(product_slug, collection_slug)
  on i.slug = m.product_slug
join collections c on c.slug = m.collection_slug
on conflict do nothing;

-- Variants (sizes/prices mirror the demo catalog).
insert into product_variants (product_id, sku, size, color, price_paise, compare_at_paise, stock)
select p.id, x.sku, x.size, x.color, x.price_paise, x.compare_at_paise, x.stock
from (values
  ('matchday-home-jersey', 'B11-HOME-S', 'S', 'Navy', 149900, 199900, 12),
  ('matchday-home-jersey', 'B11-HOME-M', 'M', 'Navy', 149900, 199900, 30),
  ('matchday-home-jersey', 'B11-HOME-L', 'L', 'Navy', 149900, 199900, 24),
  ('matchday-home-jersey', 'B11-HOME-XL', 'XL', 'Navy', 149900, 199900, 9),
  ('matchday-away-jersey', 'B11-AWAY-M', 'M', 'Off-white', 149900, 199900, 18),
  ('matchday-away-jersey', 'B11-AWAY-L', 'L', 'Off-white', 149900, 199900, 15),
  ('cover-drive-training-tee', 'B11-COVER-M', 'M', 'Teal', 79900, 99900, 40),
  ('cover-drive-training-tee', 'B11-COVER-L', 'L', 'Teal', 79900, 99900, 32),
  ('deep-midwicket-hoodie', 'B11-MIDWICKET-M', 'M', 'Navy', 179900, 219900, 14),
  ('deep-midwicket-hoodie', 'B11-MIDWICKET-L', 'L', 'Navy', 179900, 219900, 20),
  ('boundary11-kit-bag-backpack', 'B11-KITBAG-OS', 'OS', 'Navy', 249900, null, 22),
  ('sunset-sixer-cap', 'B11-SIXER-OS', 'OS', 'Saffron', 69900, 89900, 55),
  ('boundary11-wristband-pack', 'B11-WRIST-OS', 'OS', 'Multi', 39900, null, 80),
  ('heritage-retro-jersey', 'B11-RETRO-M', 'M', 'Cream', 169900, null, 10),
  ('team-travel-hoodie', 'B11-TRAVEL-L', 'L', 'Charcoal', 199900, null, 16),
  ('classic-field-cap', 'B11-FIELD-OS', 'OS', 'Navy', 64900, null, 60)
) as x(product_slug, sku, size, color, price_paise, compare_at_paise, stock)
join products p on p.slug = x.product_slug
on conflict (sku) do nothing;

-- ----------------------------------------------------------- coupons
insert into coupons (code, type, value, min_subtotal_paise, max_discount_paise, active, usage_limit, used_count) values
  ('POWERPLAY', 'percent', 15, 149900, 75000, true, null, 12),
  ('OPENING50', 'fixed', 5000, 99900, null, true, 500, 34),
  ('NEWSEASON', 'percent', 20, 199900, 100000, true, null, 3)
on conflict (code) do nothing;

-- ----------------------------------------------------------- content
insert into banners (title, subtitle, cta_label, cta_href, accent, active, "order") values
  ('Matchday, sorted', 'New home and away jerseys are live.', 'Shop jerseys', '/collections/matchday', '#1d2b53', true, 1),
  ('Build the base', 'Training essentials for the long season ahead.', 'Shop training', '/collections/training-camp', '#0d9488', true, 2),
  ('Fan favourites', 'The pieces supporters keep coming back to.', 'Shop now', '/collections/fan-favourites', '#2563eb', false, 3);

insert into settings (key, value) values
  ('store', jsonb_build_object(
    'storeName', 'Boundary11',
    'supportEmail', 'support@boundary11.example',
    'supportPhone', '+91 90000 00000',
    'currency', 'INR',
    'freeShippingThresholdPaise', 199900,
    'flatShippingPaise', 9900,
    'taxNote', 'All prices are inclusive of applicable GST.',
    'announcement', 'Free shipping on orders over ₹1,999 · Easy 14-day returns'
  ))
on conflict (key) do nothing;
