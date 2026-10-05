import { Router } from "express";
import { ah } from "../core/async.js";
import { getOrder } from "../store/orders.js";
import { addPing, enableTracking, getPings, isTracking } from "../store/tracking.js";
import { logEvent } from "../store/events.js";

// Phase 5: optional live tracking for selected deliveries (plan 9).
// Opt-in per order; pings rejected until enabled.
export const trackingRouter = Router();

trackingRouter.post(
  "/orders/:id/enable",
  ah(async (req, res) => {
    const o = await getOrder(req.params.id);
    if (!o) return res.status(404).json({ error: "order not found" });
    await enableTracking(o.id);
    await logEvent(o.id, "tracking.enabled", {});
    res.json({ ok: true, orderId: o.id, tracking: true });
  }),
);

trackingRouter.post(
  "/orders/:id/ping",
  ah(async (req, res) => {
    const o = await getOrder(req.params.id);
    if (!o) return res.status(404).json({ error: "order not found" });
    if (!(await isTracking(o.id))) return res.status(400).json({ error: "tracking not enabled for this order" });
    const { lat, lng, stage } = req.body ?? {};
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "lat and lng required" });
    }
    const ping = { lat, lng, at: new Date().toISOString(), stage };
    await addPing(o.id, ping);
    res.json({ ok: true, orderId: o.id, ping });
  }),
);

trackingRouter.get(
  "/orders/:id",
  ah(async (req, res) => {
    const o = await getOrder(req.params.id);
    if (!o) return res.status(404).json({ error: "order not found" });
    res.json({ orderId: o.id, tracking: await isTracking(o.id), pings: await getPings(o.id) });
  }),
);
