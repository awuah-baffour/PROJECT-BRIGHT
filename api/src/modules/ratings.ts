import { Router } from "express";
import { suppliers } from "../data/seed.js";
import { addRating, supplierStats } from "../store/supplierStats.js";
import { logEvent } from "../store/events.js";

// PRD 9.13: retailer rates suppliers/delivery; platform uses feedback internally.
export const ratingsRouter = Router();

ratingsRouter.get("/suppliers", (_req, res) => {
  res.json({ suppliers: suppliers.map((s) => ({ ...s })), stats: supplierStats() });
});

ratingsRouter.post("/", (req, res) => {
  const { supplierId, score, orderId, comment } = req.body ?? {};
  if (!suppliers.some((s) => s.id === supplierId)) return res.status(404).json({ error: "supplier not found" });
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return res.status(400).json({ error: "score 1-5 required" });
  }
  addRating(supplierId, score);
  if (orderId) logEvent(orderId, "supplier.rated", { supplierId, score });
  res.json({ ok: true, supplierId, score, comment: comment ?? null, stats: supplierStats()[supplierId] });
});
