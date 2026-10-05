import { Router } from "express";
import { canTransition, type OrderStatus } from "../core/orderMachine.js";
import { buildQuote } from "../core/sourcing.js";
import { priceQuote } from "../core/pricing.js";
import { getOrder, makeId, saveOrder } from "../store/orders.js";

// AD-06: draft -> quoted -> pending_payment -> paid -> sourcing -> preparing
// -> ready -> picked_up -> consolidated -> dispatched -> delivered
// Branches: exception / cancelled / refunded. Material changes need approval (PRD 10).
export const ordersRouter = Router();

ordersRouter.post("/draft", (req, res) => {
  const { items, deliveryLocationId, window } = req.body ?? {};
  if (!items?.length) return res.status(400).json({ error: "items required" });
  if (!deliveryLocationId) return res.status(400).json({ error: "one deliveryLocationId required (AD-11)" });
  res.json({
    orderId: "ord_stub",
    status: "draft" satisfies OrderStatus,
    items,
    deliveryLocationId,
    window: window ?? null,
    note: "Phase 0 stub - use POST /v1/orders/quote for Phase 1 availability + pricing",
  });
});

// Phase 1: availability check before payment (PRD 10). Returns multi-supplier
// quote with slices, partials, alternatives, single total.
ordersRouter.post("/quote", (req, res) => {
  const { items, deliveryLocationId, window } = req.body ?? {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "items [{name, qty}] required" });
  if (!deliveryLocationId) return res.status(400).json({ error: "one deliveryLocationId required (AD-11)" });
  for (const it of items) {
    if (!it?.name || !Number.isFinite(it?.qty) || it.qty <= 0) {
      return res.status(400).json({ error: "each item needs {name, qty>0}" });
    }
  }
  const quote = priceQuote(buildQuote(items));
  const slaMinutes = Number(process.env.SUPPLIER_SLA_MINUTES ?? 20);
  const respondBy = new Date(Date.now() + slaMinutes * 60_000).toISOString();
  const orderId = makeId("ord");
  saveOrder({
    id: orderId,
    status: "quoted",
    deliveryLocationId,
    window: window ?? null,
    quote,
    slices: quote.slices.map((s) => ({
      supplierId: s.supplierId,
      supplierName: s.supplierName,
      status: "assigned",
      respondBy,
      items: s.items,
      sliceTotal: s.sliceTotal,
    })),
    createdAt: new Date().toISOString(),
  });
  res.json({ orderId, status: "quoted" satisfies OrderStatus, deliveryLocationId, window: window ?? null, ...quote });
});

ordersRouter.get("/:id", (req, res) => {
  const o = getOrder(req.params.id);
  if (!o) return res.status(404).json({ error: "order not found" });
  res.json(o);
});

// Simplified pay: quoted -> paid -> sourcing, slices move to assigned with SLA.
ordersRouter.post("/:id/pay", (req, res) => {
  const o = getOrder(req.params.id);
  if (!o) return res.status(404).json({ error: "order not found" });
  if (o.status !== "quoted") return res.status(400).json({ error: `order is ${o.status}, must be quoted` });
  if (o.quote.lines.length === 0) return res.status(400).json({ error: "nothing available to pay for" });
  o.status = "paid";
  saveOrder(o);
  res.json({ ok: true, orderId: o.id, status: o.status, total: o.quote.total, slices: o.slices });
});

ordersRouter.post("/:id/transition", (req, res) => {
  const { from, to } = req.body ?? {};
  if (!canTransition(from, to)) {
    return res.status(400).json({ error: `illegal transition ${from} -> ${to}` });
  }
  res.json({ ok: true, from, to });
});
