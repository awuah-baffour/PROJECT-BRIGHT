import { Router } from "express";
import { buildQuote, loadCatalog } from "../core/sourcing.js";
import { priceQuote } from "../core/pricing.js";
import { ah } from "../core/async.js";

// AD-08: Paystack or Flutterwave aggregator. Single charge, split payables internally.
// AD-05: Postgres ledger is source of truth, webhooks reconcile.
export const paymentsRouter = Router();

paymentsRouter.post("/quote", ah(async (req, res) => {
  const { items } = req.body ?? {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "items [{name, qty}] required" });
  res.json(priceQuote(buildQuote(items, { catalog: await loadCatalog() })));
}));

paymentsRouter.post("/webhook", (req, res) => {
  res.status(503).json({
    error: "Payment webhooks are not configured. No payment was processed.",
    code: "PAYMENTS_UNAVAILABLE",
  });
});
