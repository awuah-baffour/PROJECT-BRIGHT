import { Router } from "express";
import { canTransition, type OrderStatus } from "../core/orderMachine.js";
import { ah } from "../core/async.js";
import { buildQuote } from "../core/sourcing.js";
import { priceQuote } from "../core/pricing.js";
import { getOrder, makeId, saveOrder } from "../store/orders.js";
import { logEvent, timeline } from "../store/events.js";
import { issuesForOrder } from "../store/issues.js";
import { recordAssign } from "../store/supplierStats.js";
import { recordPurchase } from "../store/history.js";
import { getAllPreferences, preferredSupplierFor } from "../store/preferences.js";

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
// Phase 5: accepts legacy {items, deliveryLocationId} or multi-drop
// {deliveries: [{locationId, items}]}. One total, fee per drop.
ordersRouter.post(
  "/quote",
  ah(async (req, res) => {
    const { items, deliveryLocationId, deliveries, window } = req.body ?? {};
    let drops: { locationId: string; items: { name: string; qty: number }[] }[];
    if (Array.isArray(deliveries) && deliveries.length > 0) {
      drops = deliveries;
    } else if (Array.isArray(items) && items.length > 0 && deliveryLocationId) {
      drops = [{ locationId: deliveryLocationId, items }];
    } else {
      return res.status(400).json({ error: "items + deliveryLocationId, or deliveries [{locationId, items}] required" });
    }
    for (const d of drops) {
      if (!d?.locationId || !Array.isArray(d?.items) || d.items.length === 0) {
        return res.status(400).json({ error: "each delivery needs {locationId, items[]}" });
      }
      for (const it of d.items) {
        if (!it?.name || !Number.isFinite(it?.qty) || it.qty <= 0) {
          return res.status(400).json({ error: "each item needs {name, qty>0}" });
        }
      }
    }
    const allPrefs = await getAllPreferences();
    // Quote each drop with its own location preferences, then merge by supplier.
    const perDrop = drops.map((d) => ({
      locationId: d.locationId,
      quote: buildQuote(d.items, {
        preferredSupplierFor: (name) => preferredSupplierFor(allPrefs, d.locationId, name),
      }),
    }));
    const mergedLines = perDrop.flatMap((d) => d.quote.lines.map((l) => ({ ...l, locationId: d.locationId })));
    const mergedUnavailable = perDrop.flatMap((d) =>
      d.quote.unavailable.map((u) => ({ ...u, locationId: d.locationId })),
    );
    const sliceMap = new Map<string, { supplierId: string; supplierName: string; items: typeof mergedLines; sliceTotal: number }>();
    for (const l of mergedLines) {
      const s = sliceMap.get(l.supplierId) ?? { supplierId: l.supplierId, supplierName: l.supplierName, items: [], sliceTotal: 0 };
      s.items.push(l);
      s.sliceTotal += l.lineTotal;
      sliceMap.set(l.supplierId, s);
    }
    const quote = priceQuote(
      {
        lines: mergedLines,
        slices: [...sliceMap.values()],
        unavailable: mergedUnavailable,
        subtotal: mergedLines.reduce((t, l) => t + l.lineTotal, 0),
      },
      { drops: drops.length },
    );
    const locations = drops.map((d) => d.locationId);
    const slaMinutes = Number(process.env.SUPPLIER_SLA_MINUTES ?? 20);
    const respondBy = new Date(Date.now() + slaMinutes * 60_000).toISOString();
    const orderId = makeId("ord");
    await saveOrder({
      id: orderId,
      status: "quoted",
      deliveryLocationId: locations[0],
      deliveryLocations: locations,
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
    await logEvent(orderId, "order.quoted", { total: quote.total, suppliers: quote.slices.length, drops: locations.length });
    for (const s of quote.slices) recordAssign(s.supplierId);
    res.json({
      orderId,
      status: "quoted" satisfies OrderStatus,
      deliveryLocationId: locations[0],
      deliveryLocations: locations,
      window: window ?? null,
      ...quote,
    });
  }),
);

ordersRouter.get(
  "/:id",
  ah(async (req, res) => {
    const o = await getOrder(req.params.id);
    if (!o) return res.status(404).json({ error: "order not found" });
    res.json(o);
  }),
);

// Simplified pay: quoted -> paid -> sourcing, slices move to assigned with SLA.
ordersRouter.post(
  "/:id/pay",
  ah(async (req, res) => {
    const o = await getOrder(req.params.id);
    if (!o) return res.status(404).json({ error: "order not found" });
    if (o.status !== "quoted") return res.status(400).json({ error: `order is ${o.status}, must be quoted` });
    if (o.quote.lines.length === 0) return res.status(400).json({ error: "nothing available to pay for" });
    o.status = "paid";
    await saveOrder(o);
    for (const loc of o.deliveryLocations ?? [o.deliveryLocationId]) {
      await recordPurchase(
        loc,
        o.quote.lines.filter((l) => (l.locationId ?? o.deliveryLocationId) === loc),
      );
    }
    await logEvent(o.id, "order.paid", { total: o.quote.total });
    res.json({ ok: true, orderId: o.id, status: o.status, total: o.quote.total, slices: o.slices });
  }),
);

// Detailed progress by order + item + supplier + stage (PRD 9.8, 9.12).
ordersRouter.get(
  "/:id/timeline",
  ah(async (req, res) => {
    const o = await getOrder(req.params.id);
    if (!o) return res.status(404).json({ error: "order not found" });
    res.json({
      orderId: o.id,
      status: o.status,
      slices: o.slices.map((s) => ({ supplierId: s.supplierId, supplierName: s.supplierName, status: s.status, respondBy: s.respondBy })),
      issues: await issuesForOrder(o.id),
      events: await timeline(o.id),
    });
  }),
);

// Buy-again: rebuild quote from previous lines (whole order). Rechecks live
// availability + price per PRD 12.2 repeat order.
ordersRouter.post(
  "/:id/reorder",
  ah(async (req, res) => {
    const prev = await getOrder(req.params.id);
    if (!prev) return res.status(404).json({ error: "order not found" });
    const items = prev.quote.lines.map((l) => ({ name: l.requestedName, qty: l.qtyRequested }));
    const allPrefs = await getAllPreferences();
    const quote = priceQuote(
      buildQuote(items, {
        preferredSupplierFor: (name) => preferredSupplierFor(allPrefs, prev.deliveryLocationId, name),
      }),
    );
    const slaMinutes = Number(process.env.SUPPLIER_SLA_MINUTES ?? 20);
    const respondBy = new Date(Date.now() + slaMinutes * 60_000).toISOString();
    const orderId = makeId("ord");
    await saveOrder({
      id: orderId,
      status: "quoted",
      deliveryLocationId: prev.deliveryLocationId,
      deliveryLocations: prev.deliveryLocations ?? [prev.deliveryLocationId],
      window: prev.window,
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
    await logEvent(orderId, "order.quoted", { reorderOf: prev.id, total: quote.total });
    for (const s of quote.slices) recordAssign(s.supplierId);
    res.json({ orderId, reorderOf: prev.id, status: "quoted" satisfies OrderStatus, ...quote });
  }),
);

ordersRouter.post("/:id/transition", (req, res) => {
  const { from, to } = req.body ?? {};
  if (!canTransition(from, to)) {
    return res.status(400).json({ error: `illegal transition ${from} -> ${to}` });
  }
  res.json({ ok: true, from, to });
});
