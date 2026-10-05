import { Router } from "express";
import { ah } from "../core/async.js";
import { flags } from "../core/flags.js";
import { logEvent, timeline } from "../store/events.js";
import { getOutbound, listOutbound, newOutboundId, saveOutbound } from "../store/outbound.js";

// Phase 3 pilot, gated by FEATURE_OUTBOUND_PILOT (AD-14). Entry: Phase 1
// fill rate / on-time / refund time stable in pilot zone (plan 7).
// Reuses events timeline + proof-of-delivery pattern from Phase 1.
export const outboundRouter = Router();

outboundRouter.use((_req, res, next) => {
  if (!flags.outboundPilot) {
    return res.status(403).json({ error: "outbound pilot disabled - set FEATURE_OUTBOUND_PILOT=true and restart" });
  }
  next();
});

outboundRouter.post(
  "/",
  ah(async (req, res) => {
    const { sourceChannel, serviceType, pickupNote, customerName, customerPhone, dropoffAddress, landmark, packageNote, codAmount } =
      req.body ?? {};
    if (!["whatsapp", "phone", "social", "website", "manual"].includes(sourceChannel)) {
      return res.status(400).json({ error: "sourceChannel whatsapp|phone|social|website|manual required" });
    }
    if (!["delivery_only", "pick_pack_delivery"].includes(serviceType)) {
      return res.status(400).json({ error: "serviceType delivery_only|pick_pack_delivery required" });
    }
    if (!customerName || !customerPhone || !dropoffAddress || !landmark) {
      return res.status(400).json({ error: "customerName, customerPhone, dropoffAddress, landmark required (AD-11)" });
    }
    if (serviceType === "delivery_only" && !pickupNote) {
      return res.status(400).json({ error: "pickupNote required for delivery_only (package already prepared)" });
    }
    const id = newOutboundId();
    const order = {
      id,
      sourceChannel,
      serviceType,
      pickupNote: pickupNote ?? "partner FC / retailer shop",
      customerName,
      customerPhone,
      dropoffAddress,
      landmark,
      packageNote: packageNote ?? "",
      codAmount: codAmount ?? 0,
      status: "created" as const,
      rider: null,
      proof: null,
      createdAt: new Date().toISOString(),
    };
    await saveOutbound(order);
    await logEvent(id, "outbound.created", { serviceType, sourceChannel });
    res.json(order);
  }),
);

outboundRouter.get(
  "/",
  ah(async (_req, res) => {
    res.json({ orders: await listOutbound() });
  }),
);

outboundRouter.get(
  "/:id",
  ah(async (req, res) => {
    const o = await getOutbound(req.params.id);
    if (!o) return res.status(404).json({ error: "outbound order not found" });
    res.json({ ...o, events: await timeline(o.id) });
  }),
);

outboundRouter.post(
  "/:id/assign",
  ah(async (req, res) => {
    const o = await getOutbound(req.params.id);
    if (!o) return res.status(404).json({ error: "outbound order not found" });
    if (o.status !== "created") return res.status(400).json({ error: `order is ${o.status}` });
    if (!req.body?.rider) return res.status(400).json({ error: "rider required" });
    o.status = "assigned";
    o.rider = req.body.rider;
    await saveOutbound(o);
    await logEvent(o.id, "outbound.assigned", { rider: o.rider });
    res.json(o);
  }),
);

outboundRouter.post(
  "/:id/pickup",
  ah(async (req, res) => {
    const o = await getOutbound(req.params.id);
    if (!o) return res.status(404).json({ error: "outbound order not found" });
    if (o.status !== "assigned") return res.status(400).json({ error: `order is ${o.status}, must be assigned` });
    o.status = "picked_up";
    await saveOutbound(o);
    await logEvent(o.id, "outbound.picked_up", {});
    res.json(o);
  }),
);

outboundRouter.post(
  "/:id/deliver",
  ah(async (req, res) => {
    const o = await getOutbound(req.params.id);
    if (!o) return res.status(404).json({ error: "outbound order not found" });
    if (o.status !== "picked_up") return res.status(400).json({ error: `order is ${o.status}, must be picked_up` });
    if (!req.body?.recipient) return res.status(400).json({ error: "recipient required for proof of delivery" });
    o.status = "delivered";
    o.proof = { recipient: req.body.recipient, at: new Date().toISOString() };
    await saveOutbound(o);
    await logEvent(o.id, "outbound.delivered", { recipient: o.proof.recipient });
    res.json(o);
  }),
);

outboundRouter.post(
  "/:id/cancel",
  ah(async (req, res) => {
    const o = await getOutbound(req.params.id);
    if (!o) return res.status(404).json({ error: "outbound order not found" });
    if (o.status === "delivered") return res.status(400).json({ error: "already delivered" });
    o.status = "cancelled";
    await saveOutbound(o);
    await logEvent(o.id, "outbound.cancelled", {});
    res.json(o);
  }),
);
