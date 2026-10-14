# Project Bright — API

Node + TypeScript modular monolith for Project Bright's retailer, supplier, and operations APIs.

## Run (on your machine with Node 22+ and PostgreSQL)

```powershell
cd api
Copy-Item .env.example .env
npm install
npm run vercel-build
npm run dev
# GET http://localhost:3000/v1/health
```

## Accounts and administration

- `POST /v1/identity/retailers/register` — `{ phone, password, shopName, address, landmark, deliveryNotes? }`
- `POST /v1/identity/suppliers/register` — `{ phone, password, businessName }`; supplier applications start pending approval.
- `POST /v1/identity/login` — `{ phone, password }`; returns a 30-day bearer token.
- `GET /v1/identity/me` and `POST /v1/identity/logout` — inspect/revoke the current session.
- `POST /v1/identity/staff` — retailer owner/manager creates a manager or staff login and may set daily/per-order caps. Caps are stored for later enforcement and must not be treated as active spending controls yet.
- `GET /v1/suppliers/me` and `/v1/suppliers/dashboard` — supplier account/profile and paid assigned slices.
- `GET|POST /v1/suppliers/products` and `PATCH /v1/suppliers/products/:id` — approved suppliers manage their own catalog listings and stock; listed products feed catalog search and quotes.
- `/v1/admin/*` — admin-only dashboard, retailer/supplier/order/account lists, supplier approval/rejection, and admin provisioning.

Passwords are scrypt-hashed. Session tokens are random, stored only as hashes, and expire after 30 days. Phone numbers are normalized and marked unverified; secure-password login is temporary until an SMS OTP provider is selected. Configure `ADMIN_BOOTSTRAP_PHONE` and `ADMIN_BOOTSTRAP_PASSWORD` in the deployment environment to create the first admin account on startup. The password must contain at least 12 characters. Remove the bootstrap values after the initial account is created.

`GET /v1/integrations/status` lists deferred payment, WhatsApp, and SMS services. Payment attempts, unconfigured webhooks, and WhatsApp sends return an explicit `503` response; they do not report success or change an order to paid.

## Structure

- `src/index.ts` — Express app, `/v1/*` routes
- `src/core/orderMachine.ts` — order state machine + legal transitions
- `src/core/flags.ts` — feature flags
- `src/modules/identity.ts` — registration, password login, staff accounts, and admin bootstrap
- `src/modules/auth.ts` — password hashing, expiring bearer sessions, and role checks
- `src/modules/admin.ts` — admin dashboard and supplier onboarding review
- `src/modules/suppliers.ts` — supplier account/profile dashboard
- `src/modules/integrations.ts` — availability status for deferred third-party services
- `src/modules/catalog.ts` — catalog search
- `src/modules/orders.ts` — order quoting, status, and fulfillment
- `src/modules/payments.ts` — quote calculation and payment webhook endpoint
- `prisma/schema.prisma` — database models

Payment processing, payment webhook reconciliation, SMS phone verification, and WhatsApp messaging remain inactive until provider choices and credentials are available.

## Frontend workspace

The browser workspace is a responsive, same-origin multi-page application in `web/`. Express serves these pages and their static assets alongside the API; no separate frontend build or development server is required.

| Page | Route | Purpose |
| --- | --- | --- |
| Landing and account access | `/` | Public service overview, retailer sign-in, and shop registration |
| Retailer home | `/home.html` | Personalized restock dashboard and order status |
| Restock | `/restock.html` | Voice/text item entry, persistent basket, catalog browsing, and quotes |
| Orders | `/orders.html` | Quote review, order timeline, tracking, repeat orders, and support |
| Supplier catalog | `/suppliers.html` | Searchable catalog of approved supplier products |
| Profile | `/profile.html` | Retailer details, team access, settings, and sign-out |
| Supplier access | `/access.html` | Supplier application and team access |
| Supplier workspace | `/supplier.html` | Supplier profile, assigned orders, products, and stock |
| Operations | `/ops.html` | Admin metrics, supplier review, and order exceptions |
| Settings | `/settings.html` | API connection and default delivery location |

For a Vercel deployment, set the Vercel project root directory to `api`, connect Prisma Postgres from the Vercel Marketplace, and ensure its PostgreSQL connection URL is available as `DATABASE_URL`. Set the build command to `npm run vercel-build`; the project rewrite sends page and API requests to the Express serverless function, which serves `web/` as well as `/v1/*`. The service worker caches the app shell only; API data remains network-only so cached pages do not imply order or payment actions are available offline.

For local development, set `DATABASE_URL` in `.env` to a PostgreSQL connection string, then run `npm install`, `npm run vercel-build`, and `npm run dev`. Do not use the former SQLite URL (`file:./dev.db`) with this PostgreSQL schema.
