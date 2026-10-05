import { Router } from "express";

// AD-08: Paystack or Flutterwave aggregator. Single charge, split payables internally.
// AD-05: Postgres ledger is source of truth, webhooks reconcile.
export const paymentsRouter = Router();

paymentsRouter.post("/quote", (req, res) => {
  const { items, deliveryFee } = req.body ?? {};
  if (!items?.length) return res.status(400).json({ error: "items required" });
  const subtotal = items.reduce((s: number, i: { price: number; qty: number }) => s + i.price * i.qty, 0);
  res.json({
    lines: items,
    deliveryFee: deliveryFee ?? 0,
    total: subtotal + (deliveryFee ?? 0),
    supplierAllocation: [],
    note: "Confirm availability before payment (PRD 10). Allocation filled in Phase 1.",
  });
});

paymentsRouter.post("/webhook", (req, res) => {
  // TODO Phase 1: verify signature, idempotency key, update payments + ledger_entries
  res.json({ ok: true, received: true });
});
