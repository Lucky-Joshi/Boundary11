# Boundary11

An original, cricket-inspired sports merchandise e-commerce platform. Boundary11 ships
as a monorepo with three runnable parts:

- **Storefront** — the customer-facing shop (React + Vite), on `http://localhost:5173`
- **Admin console** — the operations dashboard (React + Vite), on `http://localhost:5174`
- **API** — a Node.js + Express backend, on `http://localhost:5000`

All branding, product names and artwork are original. The project deliberately avoids
any cricket board marks, national team crests, sponsor logos or player likenesses, and
ships no third-party licensed merchandise.

> **Prototype status.** By default the platform runs entirely on an in-memory
> **demo provider** with a **mock payment** flow: zero setup, no database or payment
> gateway required. Adding Supabase credentials switches the API to the
> **Supabase provider** automatically (see _Milestone 2_ below).

---

## Tech stack

| Layer      | Choices                                                                 |
| ---------- | ----------------------------------------------------------------------- |
| Frontend   | React 18, Vite 6, React Router 6, TanStack Query 5, plain CSS tokens    |
| Backend    | Node.js (ESM), Express 4, Zod, Helmet, express-rate-limit               |
| Shared     | `@boundary11/shared` — constants, money maths, cart/catalog logic, Zod  |
| Data (M2)  | Supabase (PostgreSQL, Auth, Storage) + Row Level Security               |
| Testing    | Vitest, React Testing Library, Supertest                                |
| Monorepo   | npm workspaces                                                          |

No TypeScript, Next.js, Firebase, MongoDB or Tailwind CSS.

---

## Repository layout

```
boundary11/
├─ apps/
│  ├─ storefront/        # customer shop (Vite, port 5173)
│  └─ admin/             # staff console (Vite, port 5174)
├─ server/               # Express API (port 5000)
│  └─ src/
│     ├─ config/         # env + logger
│     ├─ middleware/     # auth, validation, errors, rate limiting
│     ├─ modules/        # products, categories, cart, orders, auth, inventory, reviews, admin, misc
│     ├─ providers/      # demo + supabase providers + selection layer
│     ├─ utils/          # token, csv and other helpers
│     └─ data/           # demo catalog seed
├─ packages/
│  └─ shared/            # code shared by API + both frontends
└─ supabase/
   ├─ migrations/0001_init.sql       # core schema + RLS
   ├─ migrations/0002_engagement.sql # reviews, contact messages, subscribers + RLS
   └─ seed.sql                       # demo content
```

---

## Prerequisites

- **Node.js 20+** (developed on Node 24)
- **npm 10+**
- Git

---

## Quick start

```bash
# 1. Install all workspace dependencies
npm install

# 2. (Optional) copy the example env file — the apps run with defaults without it
cp .env.example .env      # macOS/Linux
copy .env.example .env    # Windows (PowerShell)

# 3. Start the API, storefront and admin console together
npm run dev
```

Then open:

- Storefront — <http://localhost:5173>
- Admin console — <http://localhost:5174>
- API health — <http://localhost:5000/api/v1/health>

Run just one part:

```bash
npm run dev:api     # API only
npm run dev:store   # storefront only
npm run dev:admin   # admin console only
```

---

## Demo accounts

The demo provider seeds these accounts. Passwords are prototype-only — never reuse them.

| Email                          | Password      | Role     | Where        |
| ------------------------------ | ------------- | -------- | ------------ |
| `admin@boundary11.example`     | `admin12345`  | admin    | Admin console |
| `support@boundary11.example`   | `support123`  | support  | Admin console |
| `fan@boundary11.example`       | `customer123` | customer | Storefront   |
| `priya@example.com`            | `priya12345`  | customer | Storefront   |

Only `admin` and `support` accounts can sign in to the admin console.

---

## Environment variables

Copy `.env.example` to `.env`. **Only `VITE_*` variables reach the browser**; never put
secrets there.

| Variable                    | Purpose                                                        |
| --------------------------- | -------------------------------------------------------------- |
| `PORT`                      | API port (default `5000`)                                      |
| `NODE_ENV`                  | `development` \| `test` \| `production`                        |
| `CORS_ORIGINS`              | Comma-separated allowed origins for CORS                       |
| `SUPABASE_URL`              | Supabase project URL (blank ⇒ demo mode)                       |
| `SUPABASE_ANON_KEY`         | Supabase anon key                                              |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key; leaving blank keeps the API in demo mode      |
| `VITE_API_URL`              | API base URL used by both frontends                            |
| `DEMO_AUTH_SECRET`          | Signs demo tokens; changing it invalidates existing tokens     |

---

## Scripts

Run from the repository root:

| Command             | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `npm run dev`       | API + storefront + admin (concurrently)                  |
| `npm run build`     | Production build of both frontends                       |
| `npm test`          | Full test suite (shared, API, storefront, admin)         |
| `npm run lint`      | ESLint across the workspace                              |
| `npm run lint:fix`  | ESLint with autofix                                      |

Per-workspace: `npm run <script> -w @boundary11/server` (also `-w @boundary11/storefront`,
`-w @boundary11/admin`, `-w @boundary11/shared`).

---

## API overview

Base URL: `/api/v1`. Errors use a consistent shape: `{ error: { code, message, fields? } }`.

### Public

| Method | Path                              | Notes                                  |
| ------ | --------------------------------- | -------------------------------------- |
| GET    | `/health`                         | Status + active data mode              |
| GET    | `/products`                       | Filter, sort, paginate the catalog     |
| GET    | `/products/:slug`                 | Product detail                         |
| GET    | `/products/:slug/related`         | Related products                       |
| GET    | `/products/:slug/reviews`         | Reviews + rating summary for a product |
| GET    | `/categories`                     | Category list                          |
| GET    | `/collections` `/collections/:slug` | Collection list / detail             |
| GET    | `/banners`                        | Active homepage banners                |
| GET    | `/cart`                           | Cart for the `x-cart-id` header        |
| POST   | `/cart/items`                     | Add item                               |
| PATCH  | `/cart/items/:itemId`             | Change quantity                        |
| DELETE | `/cart/items/:itemId` `/cart`     | Remove item / clear cart               |
| POST   | `/checkout`                       | Create an order (mock payment)         |
| POST   | `/payments/verify`                | Verify the mock payment outcome        |
| POST   | `/auth/login` `/auth/register`    | Issue / create account                 |
| POST   | `/contact`                        | Persist a contact message (demo store) |
| POST   | `/newsletter`                     | Subscribe an email (idempotent)        |

### Authenticated

| Method | Path                        | Notes                                    |
| ------ | --------------------------- | ---------------------------------------- |
| GET    | `/auth/me`                  | Current account                          |
| POST   | `/products/:slug/reviews`   | Submit a product review                  |
| GET    | `/orders`                   | Own orders (staff see all)               |
| GET    | `/orders/:id`               | Own order (staff see any)                |

### Admin (staff roles)

`/admin/*` requires an `admin`/`support` token. Highlights: `analytics`, `products` CRUD
and status changes, `orders` + status updates, `inventory` + `adjustments`, `customers`,
`discounts`, `content/banners`, `settings`, `audit-logs`, `staff` (admin only), plus:

| Method | Path                 | Notes                                          |
| ------ | -------------------- | ---------------------------------------------- |
| GET    | `/admin/reviews`     | All reviews (filter `?status=`)                |
| PATCH  | `/admin/reviews/:id` | Moderate a review (admin only)                 |
| GET    | `/admin/messages`    | Contact messages                               |
| PATCH  | `/admin/messages/:id`| Update message status                          |
| GET    | `/admin/subscribers` | Newsletter subscribers                         |
| GET    | `/admin/exports/:kind` | CSV export — `orders`, `customers`, `inventory` |

---

## Feature highlights

- **Product reviews** — signed-in customers rate 1–5 and review from the product page; the
  storefront shows a rating breakdown and the admin console moderates each review
  (publish/reject). Star rating blends with the seeded baseline on new submissions.
- **Order tracking** — the account order page renders the full `statusHistory` timeline
  (`pending → paid → …`, plus cancelled/refunded traces).
- **Coupons** — apply/remove codes in the cart; invalid codes surface a reason
  (`BOUNDARY10`, `FLAT200`, `NEWSEASON15` in the demo seed).
- **Banners, contact & newsletter** — the homepage hero is driven by active banners;
  contact submissions and newsletter sign-ups are persisted and reviewable in admin.
- **CSV exports** — one-click `orders`, `customers` and `inventory` exports from the admin
  console (RFC-4180 escaped).
- **Recently viewed** — a homepage rail of the last products the visitor opened, stored
  under `b11_recently_viewed`.

---

## Key design decisions

- **Money is always an integer number of paise** (1 rupee = 100 paise). No floating point
  is ever used for money; formatting is centralised in `@boundary11/shared`.
- **Auth tokens live in module memory only**, never in `localStorage`. A page refresh
  signs you out. Production should use server-issued httpOnly cookies via Supabase Auth.
- **Only non-sensitive client state is persisted**: the cart id (`b11_cart_id`), the
  wishlist (`b11_wishlist`) and recently viewed products (`b11_recently_viewed`) live in
  `localStorage`.
- **Data access goes through a provider interface.** The in-memory `demoProvider` can be
  swapped for a Supabase-backed provider without touching the route/controller layer.
- **One shared package** holds constants, validation and business maths so the API and
  both frontends cannot drift.
- **Free shipping** over ₹1,999 (`199900` paise); otherwise a flat ₹99 (`9900` paise).
  Maximum 10 units per cart line.
- **Order lifecycle** is explicit: `pending → paid → processing → shipped → delivered`,
  with `cancelled`/`refunded` reachable per `ORDER_STATUS_TRANSITIONS`.

---

## Testing

```bash
npm test
```

Coverage:

- `packages/shared` — money, cart totals, catalog helpers, validation (47 tests)
- `server` — token utilities, provider interface/selection, and the API surface via
  Supertest, including reviews, contact/newsletter persistence and CSV exports (54 tests)
- `storefront` — component behaviour with RTL (4 tests)
- `admin` — auth gate + dashboard flow with RTL (2 tests)

> Note: the demo provider resets on every server restart; orders placed in the UI are not
> persisted across restarts.

---

## Milestone 2 — Supabase

The API now ships **two interchangeable data providers** behind a single
repository interface (`server/src/providers/index.js`):

- `demoProvider` — in-memory prototype data (the default).
- `supabaseProvider` — a real Postgres backend via Supabase.

Provider selection is automatic: the API uses Supabase when `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` are set, and falls back to the demo provider otherwise.
Every method on the provider interface is asynchronous, so the service layer `await`s
calls and works identically against either provider.

### Enabling Supabase

1. Create a Supabase project.
2. Apply the schema, then the seed:

   ```bash
   supabase db reset        # applies supabase/migrations/*, then supabase/seed.sql
   # or paste supabase/migrations/0001_init.sql and supabase/seed.sql into the SQL editor
   ```

3. Put the keys in `.env` (server-only, never commit):

   ```
   SUPABASE_URL=https://<project>.supabase.co
   SUPABASE_ANON_KEY=<anon public key>
   SUPABASE_SERVICE_ROLE_KEY=<service_role secret key>
   ```

4. Restart the API. `/api/v1/health` will report `"mode": "supabase"`.

Notes:

- **Credentials verify through Supabase Auth.** `authenticate()` calls
  `signInWithPassword` (anon key); `register()` creates the user with the service
  role and mirrors a row into `profiles`. The API still issues its own short-lived
  session token, and the role/status is re-read from `profiles` on each request.
- **Stock is decremented with an optimistic compare-and-set** (`update ... where stock = ?`)
  so concurrent checkouts cannot oversell a variant.
- **Row Level Security** is defined in the migration for any direct client access;
  the server talks to Postgres with the service role.
- The demo seed accounts (below) are created by `supabase/seed.sql` with the same
  passwords, so the same logins work in both modes.

Remaining for a production deployment:

1. Replace the mocked `x-cart-id` header with authenticated, server-owned carts.
2. Move the session token to httpOnly cookies and verify Supabase JWTs end-to-end.
3. Replace the mock payment provider with a real gateway and a signed webhook.

---

## License / content policy

This is an original demonstration project. All names, designs and copy are fictional and
created for Boundary11. Do not add real cricket board, team, sponsor or player assets.
