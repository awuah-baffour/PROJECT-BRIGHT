import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { ah } from "../core/async.js";
import { findAlternatives } from "../core/sourcing.js";
import { getOrder, saveOrder } from "../store/orders.js";
import { logEvent } from "../store/events.js";
import { recordConfirm, recordReject } from "../store/supplierStats.js";
import { transporters } from "../data/fleet.js";
import { authRequired, requireRoles } from "./auth.js";

// AD-07: respond_by + delayed job + auto re-source. AD-11: one location per order.
// PRD 10: material change (product/price/qty/time) needs retailer approval.
export const logisticsRouter = Router();

function supplierOwnsSlice(req: Request, res: Response, next: NextFunction) {
  if (req.user?.supplierId !== req.params.supplierId) return res.status(403).json({ error: "supplier can only manage its own slices" });
  next();
}

logisticsRouter.post("/slices/:id/assign", authRequired, requireRoles("admin"), (req, res) => {
  const slaMinutes = Number(process.env.SUPPLIER_SLA_MINUTES ?? 20);
  const respondBy = new Date(Date.now() + slaMinutes * 60_000).toISOString();
  res.json({ sliceId: req.params.id, respondBy, slaMinutes });
});

logisticsRouter.post("/slices/:id/timeout", authRequired, requireRoles("admin"), (req, res) => {
  // TODO Phase 1: mark expired, re-source, notify ops, approval if material change
  res.json({ sliceId: req.params.id, expired: true, resourcing: "queued" });
});

// Supplier confirms its slice: order paid -> sourcing.
logisticsRouter.post(
  "/orders/:orderId/slices/:supplierId/confirm",
  authRequired,
  requireRoles("supplier"),
  supplierOwnsSlice,
  ah(async (req, res) => {
    const o = await getOrder(req.params.orderId);
    if (!o) return res.status(404).json({ error: "order not found" });
    if (!["paid", "sourcing", "preparing", "ready"].includes(o.status)) {
      return res.status(409).json({ error: "supplier fulfillment is unavailable until a real payment is confirmed" });
    }
    const slice = o.slices.find((s) => s.supplierId === req.params.supplierId);
    if (!slice) return res.status(404).json({ error: "slice not found" });
    if (slice.status !== "assigned") return res.status(400).json({ error: `slice is ${slice.status}` });
    slice.status = "confirmed";
    if (o.status === "paid") o.status = "sourcing";
    await saveOrder(o);
    recordConfirm(slice.supplierId);
    await logEvent(o.id, "slice.confirmed", { supplierId: slice.supplierId });
    res.json({ ok: true, orderId: o.id, status: o.status, slice });
  }),
);

// Supplier rejects: auto re-source from approved alternates per line.
logisticsRouter.post(
  "/orders/:orderId/slices/:supplierId/reject",
  authRequired,
  requireRoles("supplier"),
  supplierOwnsSlice,
  ah(async (req, res) => {
    const o = await getOrder(req.params.orderId);
    if (!o) return res.status(404).json({ error: "order not found" });
    if (!["paid", "sourcing", "preparing", "ready"].includes(o.status)) {
      return res.status(409).json({ error: "supplier fulfillment is unavailable until a real payment is confirmed" });
    }
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
    await saveOrder(o);
    recordReject(slice.supplierId);
    await logEvent(o.id, "slice.rejected", { supplierId: slice.supplierId, resourced });
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
  }),
);

// Phase 5: dispatch a confirmed slice with own or 3PL capacity (PRD 9.8).
logisticsRouter.post(
  "/orders/:orderId/slices/:supplierId/dispatch",
  authRequired,
  requireRoles("admin"),
  ah(async (req, res) => {
    const o = await getOrder(req.params.orderId);
    if (!o) return res.status(404).json({ error: "order not found" });
    const slice = o.slices.find((s) => s.supplierId === req.params.supplierId);
    if (!slice) return res.status(404).json({ error: "slice not found" });
    if (slice.status !== "confirmed") return res.status(400).json({ error: `slice is ${slice.status}, must be confirmed` });
    const t = transporters.find((x) => x.id === req.body?.transporterId);
    if (!t) return res.status(404).json({ error: "transporter not found" });
    if (!t.active) return res.status(400).json({ error: "transporter suspended" });
    slice.status = "dispatched";
    slice.transporterId = t.id;
    if (o.status === "sourcing") o.status = "dispatched";
    await saveOrder(o);
    await logEvent(o.id, "slice.dispatched", { supplierId: slice.supplierId, transporterId: t.id, kind: t.kind });
    res.json({ ok: true, orderId: o.id, status: o.status, slice });
  }),
);

logisticsRouter.get("/transporters", (_req, res) => {
  res.json({ transporters });
});
