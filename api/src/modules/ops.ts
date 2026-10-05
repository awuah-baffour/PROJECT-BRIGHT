import { Router } from "express";
import { getOrder } from "../store/orders.js";
import { issuesForOrder } from "../store/issues.js";
import { supplierStats } from "../store/supplierStats.js";

// Phase 2 ops console: exception queue + cost analytics (PRD 15).
// In-memory; Postgres aggregates when DATABASE_URL is set (Phase 0 schema).
export const opsRouter = Router();

function isExpired(respondBy: string): boolean {
  return new Date(respondBy).getTime() < Date.now();
}

opsRouter.get("/exceptions", (req, res) => {
  // NOTE: orders store is module-private; expose via query param orderIds for now.
  // Simpler: caller passes ?orderId=xxx or lists known slices from timeline.
  const orderId = String(req.query.orderId ?? "");
  if (!orderId) return res.status(400).json({ error: "orderId query required in Phase 2" });
  const o = getOrder(orderId);
  if (!o) return res.status(404).json({ error: "order not found" });
  const expiredSlices = o.slices.filter((s) => s.status === "assigned" && isExpired(s.respondBy));
  res.json({
    orderId: o.id,
    status: o.status,
    expiredSlices,
    openIssues: issuesForOrder(o.id).filter((i) => i.status === "open"),
    supplierStats: supplierStats(),
  });
});

opsRouter.get("/metrics", (_req, res) => {
  res.json({
    note: "Aggregate metrics require Postgres (Phase 0 schema). In-memory per-order economics available on quote/timeline.",
    tracked: ["fill rate", "on-time rate", "confirmation rate", "problem rate", "refund time", "margin per order"],
  });
});
