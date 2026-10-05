import { Router } from "express";

// AD-07: respond_by + delayed job + auto re-source. AD-11: one location per order.
export const logisticsRouter = Router();

logisticsRouter.post("/slices/:id/assign", (req, res) => {
  const slaMinutes = Number(process.env.SUPPLIER_SLA_MINUTES ?? 20);
  const respondBy = new Date(Date.now() + slaMinutes * 60_000).toISOString();
  res.json({ sliceId: req.params.id, respondBy, slaMinutes });
});

logisticsRouter.post("/slices/:id/timeout", (req, res) => {
  // TODO Phase 1: mark expired, re-source, notify ops, approval if material change
  res.json({ sliceId: req.params.id, expired: true, resourcing: "queued" });
});
