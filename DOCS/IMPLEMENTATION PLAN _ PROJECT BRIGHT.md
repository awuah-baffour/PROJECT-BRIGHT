**IMPLEMENTATION PLAN**
**Retail Supply & Fulfillment Platform**
Working title: Project Bright

| Item | Value |
| :--- | :--- |
| Source PRD | DOCS/PRODUCT REQUIREMENTS _ PROJECT BRIGHT.md |
| PRD Date | 25 September 2026 |
| Plan Date | 04 October 2026 |
| Status | Architectural decisions approved / ready for Phase 0 |
| Primary customer | Small shops and independent retailers in Ghana |
| Core promise | Tell us what you need. We find it, coordinate it and deliver it. |

# 1. Objective

Implement the PRD in phases to prove first:

> A small retailer can describe a restocking need in ordinary language and the platform turns it into a confirmed, paid, coordinated delivery with very little effort.

Reference: PRD §13 Launch Scope, §16 Launch Readiness, §20 North Star.

# 2. Product Principles (from PRD §6)

1. Voice first, not voice only
2. Ask only when necessary
3. One order, one payment
4. Platform owns the journey
5. Customer stays in control
6. Hide complexity
7. Start simple, learn, then automate

All build decisions must preserve these.

# 3. Proposed Technical Architecture

PRD is non-technical. This is a starting assumption to be locked in Phase 0. Changing stack does not change phases.

- Client: mobile-first PWA + lightweight Android wrapper. Works on low-end devices, low bandwidth, offline-tolerant draft orders.
- Voice: device speech-to-text first, server transcription fallback. Server-side NLU for product, quantity, timing, location.
- Backend: modular monolith first. Domains: identity, catalog, sourcing, orders, payments, logistics, notifications, support/returns, ratings.
- Data: Postgres for transactional, job queue for supplier timeouts / dispatch, object storage for proofs (delivery photos, damage photos), analytics events pipeline.
- Integrations:
  - Payments: MTN MoMo, Vodafone MoMo, AirtelTigo, cards + bank transfer via Paystack or Flutterwave.
  - Comms: WhatsApp Business API + SMS gateway for confirm, prep, dispatch, delivery, exceptions.
  - Maps: GPS + editable address + landmarks / delivery notes. PRD §9.1, §9.8
- Asset-light: no owned inventory at launch. No WMS. Only supplier availability checks and orchestration. PRD §4.2, §10

## 3.1 Architectural Decisions - Review Log

All AD-01 to AD-15 approved on 04 October 2026. Recommendations in §3.2 are now locked for Phase 0.

| ID | Decision area | Recommended option | Alternatives | PRD trace | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AD-01 | Client form factor | Mobile-first PWA + Android wrapper | A) Native Android/iOS, B) WhatsApp-only bot, C) Web-only | §5 voice-first but text/browse required, §13 ordering voice/text/browse | Approved |
| AD-02 | Voice pipeline | Device STT primary + server STT fallback + server NLU | A) Server STT only, B) Third-party voice agent end-to-end | §9.2 natural language, §17 voice inaccuracy risk | Approved |
| AD-03 | Backend structure | Modular monolith with domain modules | A) Microservices from day one, B) Serverless functions only | §6 start simple, §10 one order/one payment, §11 platform owns journey | Approved |
| AD-04 | API style | REST + webhooks for payments/comms, versioned `/v1` | A) GraphQL, B) tRPC only | §9.6, §9.12 integrations need webhooks | Approved |
| AD-05 | Primary datastore | Postgres (transactional source of truth) | A) MySQL, B) Firebase/Firestore only, C) NoSQL primary | §10 availability-before-pay, ledger, audit | Approved |
| AD-06 | Order orchestration | Stateful order state machine + saga with compensations + job queue | A) Stateless CRUD, B) Choreography without orchestrator | §9.5 multi-supplier, §9.7 non-response, §9.9 changes/cancel | Approved |
| AD-07 | Supplier SLA enforcement | DB timer + queue delayed jobs for response timeout + auto re-source | A) Manual ops follow-up only, B) Cron polling | §9.7, §10 supplier non-response, §12.4 supplier failure | Approved |
| AD-08 | Payments provider | Paystack or Flutterwave aggregator for MoMo + cards + bank transfer | A) Direct MNO integrations, B) MoMo only at launch | §9.6, decision 20 | Approved |
| AD-09 | Notifications | In-app primary + WhatsApp Business API + SMS fallback via gateway | A) SMS only, B) Push only, C) WhatsApp only | §9.12, decision 39 | Approved |
| AD-10 | Identity + staff permissions | Phone OTP + PIN + RBAC (owner/manager/staff: create/approve/pay) + spending limits | A) Email/password, B) No roles at launch | §9.1, decisions 16, 43 | Approved |
| AD-11 | Location model | GPS + editable address + landmarks/notes, single location_id per order | A) GPS only, B) Free-text only | §9.1, §9.8, decision 14 one location | Approved |
| AD-12 | Media storage | S3-compatible object storage for POD photos, damage claims, supplier docs | A) Store in DB, B) No photo proof at launch | §9.8, §9.10 returns/refunds | Approved |
| AD-13 | Catalog + matching | Postgres full-text + trigram + synonym dictionary v1, vector search later | A) Vector DB day one, B) Exact-match only | §9.2, §9.3 product matching, clarification | Approved |
| AD-14 | Hosting + environments | Managed container host (e.g. Render/Railway/Fly/AWS) with dev/staging/prod + CI/CD + feature flags | A) VPS manual, B) On-prem | §15 measurable from first orders, §16 readiness | Approved |
| AD-15 | Analytics + observability | Event pipeline (order events) + error tracking + audit log for price/supplier changes | A) Logs only, B) Full data warehouse day one | §15 success measures, §10 transparent pricing | Approved |

## 3.2 AD Details

### AD-01 Client form factor
- Recommendation: PWA installable, wrapped with Capacitor/TWA for Play Store, works on 2GB RAM devices, <3G tolerant.
- Why: cheapest to ship voice+text+browse to widest retailers, one codebase, easy OTA updates. Native doubles cost. WhatsApp-only fails PRD browse/review/transparent pricing needs.
- Implication: must implement offline draft (IndexedDB), image compression, Swahili/English font support.
- To lock: confirm target devices in pilot zone.

### AD-02 Voice pipeline
- Recommendation: Web Speech API / native STT on device first (low latency, low cost), Whisper or provider STT server fallback, then own NLU service extracting {product, variant, qty/unit, window, location hint}.
- Why: device STT is free/fast but poor in noise/accents; server fallback improves accuracy. End-to-end voice agent is expensive and harder to force review-before-pay.
- Implication: store audio transcript + confidence, always show draft for review. PRD decision 22.
- To lock: languages for pilot (English + Twi/Ga/Ewe?), STT provider pricing.

### AD-03 Backend structure
- Recommendation: single deployable monolith, strict module boundaries: identity, catalog, sourcing, orders, payments, logistics, notifications, support, ratings.
- Why: matches team size at launch, preserves transactions for one-order/one-payment, avoids distributed-transaction pain. Extract to services in Phase 5 only if needed.
- Implication: module-level ownership, no cross-module DB joins except via APIs.
- To lock: language (Node/Nest or Python/FastAPI or Laravel) based on hiring.

### AD-04 API style
- Recommendation: REST `/v1/...` for clients + supplier portal + ops console, webhooks inbound from payment/comms providers, idempotency keys on create-order and charge.
- Why: REST + webhooks is best supported by Paystack/Flutterwave/WhatsApp providers in Ghana. GraphQL adds overhead with no payoff yet.
- Implication: OpenAPI spec, versioning, idempotency, webhook signature verification.

### AD-05 Primary datastore
- Recommendation: Postgres as source of truth for users, suppliers, products, orders, order_slices, payments, ledger entries.
- Why: ACID needed for availability-before-payment, single total with multi-supplier splits, refunds. Firestore-only weakens consistency.
- Implication: Redis or queue for jobs/locks only, not truth. Daily backups + PITR.
- Schema sketch: `orders (1) -> order_slices (n per supplier) -> slice_items (n)`, `payments (1) -> ledger_entries (n)`.

### AD-06 Order orchestration
- Recommendation: explicit state machine: `draft -> quoted -> pending_payment -> paid -> sourcing -> preparing -> ready -> picked_up -> consolidated -> dispatched -> delivered (+ exception/cancelled/refunded branches)` with saga compensations (release hold, refund slice, re-source).
- Why: PRD requires multi-supplier combine, edits until fulfillment, partial fills, replacements. CRUD without orchestrator will corrupt totals.
- Implication: order service owns transitions, all side effects via outbox + queue.

### AD-07 Supplier SLA enforcement
- Recommendation: on slice assignment create `respond_by` timestamp, enqueue delayed job. On timeout: auto mark `expired`, trigger re-source, notify ops, request retailer approval only if material change.
- Why: enforces PRD §10 non-response rule without ops babysitting.
- To lock: SLA value e.g. 20 min pilot, different for perishables?

### AD-08 Payments provider
- Recommendation: single aggregator (Paystack or Flutterwave) to cover MTN/Vodafone/AirtelTigo MoMo + cards + bank transfer, with webhook reconciliation.
- Why: one integration, proven Ghana MoMo support, split-payment reporting. Direct MNO integrations triple work.
- Implication: must support MoMo prompt (pay-by-phone), webhook retries, manual reconcile tool for ops. Show itemized + supplier allocation pre-pay per §9.6.
- To lock: compare fees, MoMo success rates, settlement time in Ghana.

### AD-09 Notifications
- Recommendation: in-app timeline is source of truth, WhatsApp + SMS mirror important events only (confirmed, change needed, dispatched, delivered, exception).
- Why: PRD requires platform + WhatsApp + SMS, but spamming all events burns cost and trust.
- To lock: essential vs optional moments list (PRD §18), provider (Twilio/Arkesel/Nalo for Ghana SMS).

### AD-10 Identity + staff permissions
- Recommendation: phone OTP login, 4-digit PIN for pay/approve, RBAC: owner > manager > staff, with per-staff caps (daily/order) and approval flow.
- Why: shops share phones, email is rare, staff misuse is real risk. Directly implements PRD §9.1.
- Implication: audit every approve/pay, staff invite via phone number.

### AD-11 Location model
- Recommendation: `locations {gps_lat, gps_lng, formatted_address, landmark, delivery_notes}` one `delivery_location_id` per order at launch. Editable before fulfillment.
- Why: Ghana addressing relies on landmarks. Enforces one-location rule while allowing practical findability.
- Implication: rider app shows map pin + landmark + phone, no multi-drop routing yet.

### AD-12 Media storage
- Recommendation: S3-compatible bucket with private ACL, presigned URLs, compressed images, retention policy.
- Why: POD and damage evidence required for refunds/disputes, keeps DB small.
- Implication: supplier docs, POD photos, damage photos all go here with order_id prefix.

### AD-13 Catalog + matching
- Recommendation: Postgres FTS + pg_trgm + curated synonyms ("bag of rice 50kg", "carton", local brand aliases) for v1. Add embeddings/vector rerank in Phase 2/4 only if FTS fails.
- Why: sufficient for 3-5 pilot categories, cheap, explainable. Vector DB day one is overkill and harder to tune.
- Implication: log unmatched queries to sourcing backlog per §9.2.

### AD-14 Hosting + environments
- Recommendation: managed PaaS with Docker, dev/staging/prod, GitHub Actions CI, migrations on deploy, feature flags for quick-checkout, recurring orders, outbound pilot.
- Why: fastest to pilot with review apps and rollbacks. VPS manual slows team.
- To lock: data residency preference, cost cap.

### AD-15 Analytics + observability
- Recommendation: transactional Postgres + append-only `events` table + error tracker (Sentry) + dashboard for §15 metrics. Warehouse later.
- Why: must measure fill rate, on-time, confirmation, problem, refund time from first orders without building a data team.
- Implication: emit event on every state transition, payment webhook, notification send, rating.

> Decisions AD-01 to AD-15 approved 04 Oct 2026. Proceed to Phase 0 locks: language choice, STT provider, payments aggregator (Paystack vs Flutterwave), SMS gateway, hosting target.

# 4. Phase 0: Foundation + Pilot Prep

Goal: unblock Phase 1 and de-risk operations.

## 4.1 Scope
- [ ] Lock pilot service zone (1 zone in Ghana) and first 3-5 categories. PRD §18 open decision.
- [ ] Lock commercial model v1: commission %, logistics margin, service fees. PRD §18.
- [ ] Supplier pipeline: application form, verification checklist, SLA contract (standard response time, prep accuracy), approval / suspension flow. PRD decisions 29-31.
- [ ] Transport pipeline: own capacity + approved 3PLs, pickup readiness SOP, single customer fee with internal cost tracking. PRD decision 32.
- [ ] Retailer identity: phone OTP signup, shop name, contact, 1 primary delivery location + landmarks, progressive KYC. PRD §9.1, decision 43.
- [ ] Staff + permissions: create / approve / pay roles, spending limits, approval rules. PRD §9.1, decision 16.
- [ ] Platform baseline: environments (dev/staging/prod), CI/CD, audit logs, feature flags, error tracking, analytics events for PRD §15.
- [ ] Comms templates: confirmation, supplier progress, change, dispatch, delivery, exception. Platform + WhatsApp + SMS. PRD §9.12, decision 39.

## 4.2 Exit criteria
- Can onboard 10-20 suppliers and 20-50 pilot retailers manually.
- Supplier response SLA defined and enforced by system timer.
- Team can measure request-to-confirm time and order outcomes from day one.

# 5. Phase 1: Launch - Seamless Restocking

Goal: full journey request -> availability confirm -> pay once -> coordinated multi-supplier delivery -> support. PRD §8, §13.

## 5.1 Epic: Ordering (voice / text / browse) - PRD §9.2
Build:
- Voice capture + transcription + NLU for product, variant, qty, delivery window.
- Text input with same NLU.
- Browse nearby availability + search.
- History + saved preferences to pre-fill and reduce questions.
- Clarification flow: if unclear, ask 1 focused question or show max 3 choices.
- Unsupported item capture: record request for sourcing, tell retailer it is logged.
- Immediate vs scheduled delivery selection, requested window capture.

Accept:
- Retailer can complete draft order by voice, text, or browse alone.
- Unclear request never fails silently; always clarifies or logs for sourcing.
- Quick checkout only if explicitly enabled for trusted repeats; otherwise review-before-pay. PRD decision 22.

## 5.2 Epic: Sourcing, Supplier Selection, Order Composition - PRD §9.3, §9.5
Build:
- Availability + current price check before payment. PRD rule: availability before payment.
- Multi-supplier comparison for same product.
- Recommendation v1: in-stock, price, distance, rating. Retailer can choose another option. PRD decisions 3, 27.
- One customer-facing order combining multiple suppliers, with supplier-level line items.
- Supplier prices set by suppliers initially. PRD decision 24.
- Saved preferred products / brands / suppliers.

Accept:
- One request with products from 2+ suppliers creates 1 order, 1 total.
- Customer sees per-item price, supplier name, delivery fee, other charges, total.
- Customer can see payment allocation per supplier.

## 5.3 Epic: Unavailable Items + Substitutions - PRD §9.4
Build:
- Partial fill: fulfill available qty, suggest alternatives for remainder.
- Options: accept alternative, accept partial, choose other, wait.
- Block silent material substitution.
- Store substitution choice for future preference learning (no auto-apply yet).

Accept:
- Material change (product, price, qty, time) always requires retailer approval. PRD §10.

## 5.4 Epic: Pricing + Payment - PRD §9.6
Build:
- Pricing engine: items + single delivery fee + fees + total.
- Internal cost model tracks actual multi-pickup complexity separately from customer fee. PRD decision 32.
- Pay once to platform: MoMo, card, bank transfer. PRD decision 20.
- Payment reconciliation via webhooks, failure retry, refund hooks.
- Order edit until fulfillment begins with recheck of availability / price / delivery.

Accept:
- No payment without confirmed availability + final total shown.
- One payment settles multi-supplier order.

## 5.5 Epic: Supplier Fulfillment - PRD §9.7
Build:
- Supplier portal: receive assigned slice, confirm / reject, mark ready for pickup.
- Standard response timer (e.g. 15-30 min to be locked in Phase 0).
- Auto re-source on timeout or reject.
- If replacement is equivalent (no material change), continue. If material, request retailer approval.

Accept:
- Supplier non-response never leaves retailer waiting indefinitely.
- Every re-source is logged with reason.

## 5.6 Epic: Transportation + Delivery - PRD §9.8
Build:
- Hybrid dispatch: assign own rider / 3PL, multi-pickup route, consolidation step where needed.
- One delivery location per order at launch. Editable address + notes.
- Requested window -> confirmed window logic.
- Proof of delivery: recipient name, photo / signature, timestamp.

Accept:
- Coordinated pickup from 1..n suppliers to 1 retailer location.
- One customer-facing delivery fee shown pre-pay.

## 5.7 Epic: Changes + Cancellation - PRD §9.9
Build:
- Free edit / cancel before fulfillment begins.
- After fulfillment begins: cancellation request shows applicable costs before confirm.
- Re-validation after any edit.

Accept:
- PRD §10 change window and cancellation rules enforced.

## 5.8 Epic: Tracking + Communication - PRD §9.12, §9.8
Build:
- Detailed stage timeline: confirmed, preparing, picked up, consolidated, dispatched, delivered, exception.
- No live vehicle map at launch (roadmap).
- Push / in-app + WhatsApp + SMS for important events.

Accept:
- Retailer can track by item, supplier, and fulfillment stage. PRD problem table §3.

## 5.9 Epic: Returns, Refunds, Problems - PRD §9.10
Build:
- Report flow: missing, damaged, incorrect, other.
- Platform-owned resolution: replacement, partial refund, full refund.
- Supplier / driver liability tracking internally.
- No separate supplier support channel for retailer.

Accept:
- Issue can be raised from order, resolved without retailer contacting supplier directly.

## 5.10 Epic: Retention + Trust - PRD §9.2, §9.13, §8
Build:
- Purchase history, saved products / suppliers.
- Buy again: whole order or selected items.
- Recurring orders v1 (manual schedule, no predictions yet).
- Ratings for suppliers / delivery post-order, internal quality scoring.

Accept:
- Repeat order reconstructs from history then rechecks live availability / price.

## 5.11 Phase 1 Launch Readiness Checklist - PRD §16
- [ ] Request to payment without manual supplier coordination
- [ ] Multi-supplier order works end-to-end
- [ ] Availability + price confirmed before payment
- [ ] Itemized total shown
- [ ] Non-response handled with replacement
- [ ] Progress tracking + notifications live
- [ ] Issue / return / refund flow live
- [ ] Consistent delivery to agreed location / window in pilot zone
- [ ] Core metrics instrumented (§15)

# 6. Phase 2: Improve - Repeat Usage + Service Quality

Goal: increase reliability and repeat rate. PRD §14 Phase 2.

- Smarter supplier ranking using confirmation rate, prep accuracy, issue rate, on-time rate.
- Improved NLU for Ghanaian English, Twi, Ga, Ewe accents, noisy markets, code-switching.
- Richer recurring orders: edit schedule, skip week, pause.
- Selective minimums only where multi-pickup is uneconomical. PRD decision 38. No blanket minimum.
- Ops console v2: exception queue, re-sourcing, partial refunds, damage rules per category.
- Wider 3PL coverage, better pickup SLA adherence.
- Cost analytics: gross margin per order, AOV, delivery contribution, commission revenue.

# 7. Phase 3: Outbound Fulfillment Pilot - PRD §9.11

Goal: expand beyond inbound restocking. Do not build in Phase 1.

- Import retailer customer order from WhatsApp / phone / social / website (manual entry first, no auto integrations).
- Service types:
  1. Delivery-only: package already prepared.
  2. Full pick, pack + delivery where platform / partner has stock access.
- Partner fulfillment center pilot: store retailer inventory, pick / pack / dispatch.
- Reuse tracking, comms, and proof-of-delivery from Phase 1.

Entry criteria: Phase 1 fill rate, on-time rate, and refund time stable in pilot zone.

# 8. Phase 4: Intelligence

Goal: reduce retailer effort using history. PRD §14 Phase 4.

- Smart replenishment suggestions based on purchase cadence.
- Substitution preferences: learn from prior accepts / rejects, still require approval for material changes until trust threshold met.
- Demand-based recommendations, predictive low-stock nudges.
- Guardrail: what history volume is required before automation? PRD §18 open decision. Default: no auto-substitution without explicit opt-in.

# 9. Phase 5: Scale - Operating Infrastructure

Goal: become retailer operating layer. PRD §14 Phase 5.

- Multiple delivery locations per order.
- Broader 3PL services, partner inventory holding.
- More sales-channel connections.
- Optional live tracking for selected deliveries.
- Additional markets beyond Ghana.
- Full inventory / replenishment if data justifies it. Explicit non-goal at launch. PRD §4.2.

# 10. Cross-Cutting Requirements

## Payments ledger
One customer charge -> split payables to suppliers / transporters. Track commission + logistics margin + service fees. Reconciliation + settlement reports.

## Security + privacy
Phone OTP, role-based access, PII minimization, MoMo number protection, audit trail for price / supplier changes, refund approvals.

## Analytics - PRD §15
Ease: first-order success %, request-to-confirm time.
Voice: % voice requests to accurate draft without manual fix.
Reliability: fill rate, delivery success, accuracy.
Speed: request-to-availability, confirm-to-delivery.
Trust: problem rate, refund resolution time, CSAT.
Repeat: repeat rate, buy-again usage, recurring adoption.
Supply: confirmation rate, prep accuracy, supplier issue rate.
Logistics: on-time rate, failed pickup rate, damage rate.
Economics: margin per order, AOV, delivery contribution, commission revenue.

## Operating model - PRD §11
Retailer: request, review/approve, pay, receive, report.
Platform: interpret, source, coordinate, collect payment, manage logistics + support.
Supplier: confirm, prepare for pickup.
Transport: collect, consolidate, deliver.
Partner FC (future): store + pick/pack/dispatch.

# 11. Key Risks + Responses - PRD §17

1. Unreliable availability -> confirm before pay, alternates, quality monitoring.
2. Supplier delays -> response SLA + auto replacement.
3. Multi-supplier logistics cost -> single customer fee, internal cost tracking, selective minimums.
4. Wrong / damaged -> platform-owned resolution + quality scoring.
5. Payment distrust -> transparent pricing, supplier details, visible status, clear refunds.
6. Voice inaccuracy -> targeted clarification, review-before-pay.
7. Scope creep -> restocking only at launch, defer inventory / outbound / multi-location.

# 12. Open Product Decisions Carried Forward - PRD §18

Still required before / during build:
- First categories, first service zone, delivery windows / SLAs.
- Supplier standards + verification checks.
- Commission / margin / fee structure.
- Supplier / transporter contracts.
- Partial refund / return / damage rules per category.
- Pilot vs scale support levels.
- Essential vs optional WhatsApp / SMS moments.
- History threshold for smart replenishment / auto-substitution.

# 13. Suggested Build Order

1. Phase 0 foundation + supplier / transport onboarding
2. Phase 1.1 - 1.2 ordering + sourcing
3. Phase 1.4 - 1.6 payment + fulfillment + delivery
4. Phase 1.7 - 1.10 tracking + support + retention
5. Pilot hardening against §16 checklist
6. Phase 2 improvements from live data
7. Phase 3 outbound pilot only after reliability stable

No dates set. Set numerical targets after pilot data per PRD §15.
