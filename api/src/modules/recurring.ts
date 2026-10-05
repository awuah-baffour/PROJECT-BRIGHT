import { Router } from "express";
import { ah } from "../core/async.js";
import { getOrder, makeId, saveOrder } from "../store/orders.js";
import { buildQuote } from "../core/sourcing.js";
import { priceQuote } from "../core/pricing.js";
import { logEvent } from "../store/events.js";
import { getRecurring, listRecurring, newRecurringId, saveRecurring } from "../store/recurring.js";

// Phase 2: richer recurring - weekly/biweekly, pause, skip (push nextRun), run-now.
export const recurringRouter = Router();

function nextDate(freq: "weekly" | "biweekly"): string {
  const d = new Date();
  d.setDate(d.getDate() + (freq === "weekly" ? 7 : 14));
  return d.toISOString();
}

recurringRouter.post(
  "/orders/:id/subscribe",
  ah(async (req, res) => {
    const prev = await getOrder(req.params.id);
    if (!prev) return res.status(404).json({ error: "order not found" });
    const frequency = req.body?.frequency ?? "weekly";
    if (!["weekly", "biweekly"].includes(frequency)) return res.status(400).json({ error: "frequency weekly|biweekly" });
    const rec = {
      id: newRecurringId(),
      sourceOrderId: prev.id,
      items: prev.quote.lines.map((l) => ({ name: l.requestedName, qty: l.qtyRequested })),
      deliveryLocationId: prev.deliveryLocationId,
      frequency,
      nextRun: nextDate(frequency),
      paused: false,
      createdAt: new Date().toISOString(),
    };
    await saveRecurring(rec);
    await logEvent(prev.id, "recurring.subscribed", { recurringId: rec.id, frequency });
    res.json(rec);
  }),
);

recurringRouter.get(
  "/",
  ah(async (_req, res) => {
    res.json({ schedules: await listRecurring() });
  }),
);

recurringRouter.post(
  "/:id/pause",
  ah(async (req, res) => {
    const r = await getRecurring(req.params.id);
    if (!r) return res.status(404).json({ error: "schedule not found" });
    r.paused = true;
    await saveRecurring(r);
    res.json(r);
  }),
);

recurringRouter.post(
  "/:id/resume",
  ah(async (req, res) => {
    const r = await getRecurring(req.params.id);
    if (!r) return res.status(404).json({ error: "schedule not found" });
    r.paused = false;
    await saveRecurring(r);
    res.json(r);
  }),
);

recurringRouter.post(
  "/:id/skip",
  ah(async (req, res) => {
    const r = await getRecurring(req.params.id);
    if (!r) return res.status(404).json({ error: "schedule not found" });
    r.nextRun = nextDate(r.frequency);
    await saveRecurring(r);
    res.json(r);
  }),
);

recurringRouter.post(
  "/:id/run-now",
  ah(async (req, res) => {
    const r = await getRecurring(req.params.id);
    if (!r) return res.status(404).json({ error: "schedule not found" });
    if (r.paused) return res.status(400).json({ error: "schedule paused" });
    const quote = priceQuote(buildQuote(r.items));
    const orderId = makeId("ord");
    await saveOrder({
      id: orderId,
      status: "quoted",
      deliveryLocationId: r.deliveryLocationId,
      deliveryLocations: [r.deliveryLocationId],
      window: null,
      quote,
      slices: quote.slices.map((s) => ({
        supplierId: s.supplierId,
        supplierName: s.supplierName,
        status: "assigned",
        respondBy: new Date(Date.now() + 20 * 60_000).toISOString(),
        items: s.items,
        sliceTotal: s.sliceTotal,
      })),
      createdAt: new Date().toISOString(),
    });
    await logEvent(orderId, "order.quoted", { recurringId: r.id, total: quote.total });
    r.nextRun = nextDate(r.frequency);
    await saveRecurring(r);
    res.json({ orderId, recurringId: r.id, ...quote });
  }),
);
