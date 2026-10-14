import { Router } from "express";
import { ah } from "../core/async.js";
import { getOrder, orderCounts } from "../store/orders.js";
import { issuesForOrder } from "../store/issues.js";
import { supplierStats } from "../store/supplierStats.js";
import { authRequired, requireRoles } from "./auth.js";

// Phase 2 ops console: exception queue + cost analytics (PRD 15).
// Metrics are now real (orders + GMV from the database); per-supplier quality
// stays in memory and rebuilds from live confirm/reject traffic.
export const opsRouter = Router();
opsRouter.use(authRequired, requireRoles("admin"));

function isExpired(respondBy: string): boolean {
  return new Date(respondBy).getTime() < Date.now();
}

opsRouter.get(
  "/exceptions",
  ah(async (req, res) => {
    const orderId = String(req.query.orderId ?? "");
    if (!orderId) return res.status(400).json({ error: "orderId query required in Phase 2" });
    const o = await getOrder(orderId);
    if (!o) return res.status(404).json({ error: "order not found" });
    const expiredSlices = o.slices.filter((s) => s.status === "assigned" && isExpired(s.respondBy));
    res.json({
      orderId: o.id,
      status: o.status,
      expiredSlices,
      openIssues: (await issuesForOrder(o.id)).filter((i) => i.status === "open"),
      supplierStats: supplierStats(),
    });
  }),
);

opsRouter.get(
  "/metrics",
  ah(async (_req, res) => {
    const counts = await orderCounts();
    res.json({
      orders: counts.orders,
      gmvPesewas: counts.gmv,
      tracked: ["fill rate", "on-time rate", "confirmation rate", "problem rate", "refund time", "margin per order"],
    });
  }),
);
