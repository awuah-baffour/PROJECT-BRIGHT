import { Router } from "express";
import { buildQuote } from "../core/sourcing.js";
import { priceQuote } from "../core/pricing.js";

// AD-08: Paystack or Flutterwave aggregator. Single charge, split payables internally.
// AD-05: Postgres ledger is source of truth, webhooks reconcile.
export const paymentsRouter = Router();

paymentsRouter.post("/quote", (req, res) => {
  const { items } = req.body ?? {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "items [{name, qty}] required" });
  res.json(priceQuote(buildQuote(items)));
});

paymentsRouter.post("/webhook", (req, res) => {
  // TODO Phase 1: verify signature, idempotency key, update payments + ledger_entries
  res.json({ ok: true, received: true });
});
