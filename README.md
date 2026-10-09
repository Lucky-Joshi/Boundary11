# Boundary11

An original, cricket-inspired sports merchandise e-commerce platform. Boundary11 ships
as a monorepo with three runnable parts:

- **Storefront** — the customer-facing shop (React + Vite), on `http://localhost:5173`
- **Admin console** — the operations dashboard (React + Vite), on `http://localhost:5174`
- **API** — a Node.js + Express backend, on `http://localhost:5000`

All branding, product names and artwork are original. The project deliberately avoids
any cricket board marks, national team crests, sponsor logos or player likenesses, and
ships no third-party licensed merchandise.

> **Prototype status.** Milestone 1 runs the entire platform on an in-memory **demo
> provider** with a **mock payment** flow. There is zero setup: no database or payment
> gateway is required. Supabase is wired in for Milestone 2 (see below).

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
│     ├─ modules/        # products, categories, cart, orders, auth, inventory, admin, misc
│     ├─ providers/      # demo (in-memory) provider + selection layer
│     └─ data/           # demo catalog seed
├─ packages/
│  └─ shared/            # code shared by API + both frontends
└─ supabase/
   ├─ migrations/0001_init.sql   # schema + RLS
   └─ seed.sql                   # demo content
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
| GET    | `/categories`                     | Category list                          |
| GET    | `/collections` `/collections/:slug` | Collection list / detail             |
| GET    | `/cart`                           | Cart for the `x-cart-id` header        |
| POST   | `/cart/items`                     | Add item                               |
| PATCH  | `/cart/items/:itemId`             | Change quantity                        |
| DELETE | `/cart/items/:itemId` `/cart`     | Remove item / clear cart               |
| POST   | `/checkout`                       | Create an order (mock payment)         |
| POST   | `/payments/verify`                | Verify the mock payment outcome        |
| POST   | `/auth/login` `/auth/register`    | Issue / create account                 |
| POST   | `/contact` `/newsletter`          | Acknowledged (no email sent in demo)   |

### Authenticated

| Method | Path             | Notes                                    |
| ------ | ---------------- | ---------------------------------------- |
| GET    | `/auth/me`       | Current account                          |
| GET    | `/orders`        | Own orders (staff see all)               |
| GET    | `/orders/:id`    | Own order (staff see any)                |

### Admin (staff roles)

`/admin/*` requires an `admin`/`support` token. Highlights: `analytics`, `products` CRUD
and status changes, `orders` + status updates, `inventory` + `adjustments`, `customers`,
`discounts`, `content/banners`, `settings`, `audit-logs`, `staff` (admin only).

---

## Key design decisions

- **Money is always an integer number of paise** (1 rupee = 100 paise). No floating point
  is ever used for money; formatting is centralised in `@boundary11/shared`.
- **Auth tokens live in module memory only**, never in `localStorage`. A page refresh
  signs you out. Production should use server-issued httpOnly cookies via Supabase Auth.
- **Only non-sensitive client state is persisted**: the cart id (`b11_cart_id`) and the
  wishlist (`b11_wishlist`) live in `localStorage`.
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

Coverage in Milestone 1:

- `packages/shared` — money, cart totals, catalog helpers, validation (47 tests)
- `server` — token utilities and the API surface via Supertest (33 tests)
- `storefront` — component behaviour with RTL (4 tests)
- `admin` — auth gate + dashboard flow with RTL (2 tests)

> Note: the demo provider resets on every server restart; orders placed in the UI are not
> persisted across restarts.

---

## Milestone 2 — Supabase

The `supabase/` folder contains the initial schema and seed. To use it:

```bash
supabase db reset   # applies supabase/migrations then supabase/seed.sql
```

Next steps once a Supabase project is configured:

1. Implement a Supabase-backed provider behind `server/src/providers/index.js`.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env` to leave demo mode.
3. Move auth to Supabase Auth (server-verified sessions, httpOnly cookies).
4. Replace the mock payment provider with a real gateway and a signed webhook.

---

## License / content policy

This is an original demonstration project. All names, designs and copy are fictional and
created for Boundary11. Do not add real cricket board, team, sponsor or player assets.
