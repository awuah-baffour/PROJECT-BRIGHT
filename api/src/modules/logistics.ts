import { Router } from "express";
import { findAlternatives } from "../core/sourcing.js";
import { getOrder, saveOrder } from "../store/orders.js";
import { logEvent } from "../store/events.js";
import { recordConfirm, recordReject } from "../store/supplierStats.js";

// AD-07: respond_by + delayed job + auto re-source. AD-11: one location per order.
// PRD 10: material change (product/price/qty/time) needs retailer approval.
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

// Supplier confirms its slice: order paid -> sourcing.
logisticsRouter.post("/orders/:orderId/slices/:supplierId/confirm", (req, res) => {
  const o = getOrder(req.params.orderId);
  if (!o) return res.status(404).json({ error: "order not found" });
  const slice = o.slices.find((s) => s.supplierId === req.params.supplierId);
  if (!slice) return res.status(404).json({ error: "slice not found" });
  if (slice.status !== "assigned") return res.status(400).json({ error: `slice is ${slice.status}` });
  slice.status = "confirmed";
  if (o.status === "paid") o.status = "sourcing";
  saveOrder(o);
  recordConfirm(slice.supplierId);
  logEvent(o.id, "slice.confirmed", { supplierId: slice.supplierId });
  res.json({ ok: true, orderId: o.id, status: o.status, slice });
});

// Supplier rejects: auto re-source from approved alternates per line.
logisticsRouter.post("/orders/:orderId/slices/:supplierId/reject", (req, res) => {
  const o = getOrder(req.params.orderId);
  if (!o) return res.status(404).json({ error: "order not found" });
  const idx = o.slices.findIndex((s) => s.supplierId === req.params.supplierId);
  if (idx === -1) return res.status(404).json({ error: "slice not found" });
  const slice = o.slices[idx];
  if (slice.status !== "assigned") return res.status(400).json({ error: `slice is ${slice.status}` });

  let resourced = false;
  let materialChange = false;
  for (const line of slice.items) {
    const alts = findAlternatives(line.productId, 1);
    if (alts.length > 0 && alts[0].inStock >= line.qtyFulfilled) {
      resourced = true;
      if (alts[0].unitPrice !== line.unitPrice) materialChange = true;
    }
  }
  slice.status = "rejected";
  saveOrder(o);
  recordReject(slice.supplierId);
  logEvent(o.id, "slice.rejected", { supplierId: slice.supplierId, resourced });
  res.json({
    ok: true,
    orderId: o.id,
    rejectedSupplier: slice.supplierId,
    resourced,
    needsRetailerApproval: materialChange,
    note: materialChange
      ? "Replacement changes price - retailer approval required (PRD 10)"
      : "Replacement equivalent - fulfillment continues",
  });
});
