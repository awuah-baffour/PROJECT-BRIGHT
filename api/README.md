# Project Bright — API Phase 0

Node + TypeScript modular monolith scaffold. Implements plan §3 AD-01..AD-15 as stubs.

## Run (on your machine with Node 22+)

```powershell
cd api
cp .env.example .env
npm install
npm run dev
# GET http://localhost:3000/v1/health
```

## Structure

- `src/index.ts` — Express app, `/v1/*` routes
- `src/core/orderMachine.ts` — AD-06 state machine + legal transitions
- `src/core/flags.ts` — AD-14 feature flags
- `src/modules/identity.ts` — AD-10 phone OTP + roles stub
- `src/modules/catalog.ts` — AD-13 search stub + sourcing backlog
- `src/modules/orders.ts` — AD-06 draft + transition guard, AD-11 one location
- `src/modules/payments.ts` — AD-08 quote + webhook stub, AD-05 ledger
- `src/modules/logistics.ts` — AD-07 SLA timer + re-source stub
- `src/modules/support.ts` — PRD 9.10 issue reporting stub
- `prisma/schema.prisma` — AD-05 Postgres models + AD-15 events

## Phase 0 exit (from plan §4.2)

- [ ] `npm run typecheck` passes
- [ ] Health + draft + quote + SLA assign return stubs
- [ ] Illegal order transition rejected (test manually)
- [ ] Prisma models reviewed against PRD §9
- [ ] Business locks still open: zone, categories, commission, Paystack vs Flutterwave, SMS gateway

Next: Phase 1 slices availability check, pricing engine, supplier confirm flow.
