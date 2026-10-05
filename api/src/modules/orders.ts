import { Router } from "express";
import { canTransition, type OrderStatus } from "../core/orderMachine.js";

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
    note: "Phase 0 stub - availability check + pricing in Phase 1",
  });
});

ordersRouter.post("/:id/transition", (req, res) => {
  const { from, to } = req.body ?? {};
  if (!canTransition(from, to)) {
    return res.status(400).json({ error: `illegal transition ${from} -> ${to}` });
  }
  res.json({ ok: true, from, to });
});
