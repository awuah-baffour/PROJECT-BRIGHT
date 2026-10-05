import { Router } from "express";
import { getOrder } from "../store/orders.js";
import { addPing, enableTracking, getPings, isTracking } from "../store/tracking.js";
import { logEvent } from "../store/events.js";

// Phase 5: optional live tracking for selected deliveries (plan 9).
// Opt-in per order; pings rejected until enabled.
export const trackingRouter = Router();

trackingRouter.post("/orders/:id/enable", (req, res) => {
  const o = getOrder(req.params.id);
  if (!o) return res.status(404).json({ error: "order not found" });
  enableTracking(o.id);
  logEvent(o.id, "tracking.enabled", {});
  res.json({ ok: true, orderId: o.id, tracking: true });
});

trackingRouter.post("/orders/:id/ping", (req, res) => {
  const o = getOrder(req.params.id);
  if (!o) return res.status(404).json({ error: "order not found" });
  if (!isTracking(o.id)) return res.status(400).json({ error: "tracking not enabled for this order" });
  const { lat, lng, stage } = req.body ?? {};
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: "lat and lng required" });
  }
  const ping = { lat, lng, at: new Date().toISOString(), stage };
  addPing(o.id, ping);
  res.json({ ok: true, orderId: o.id, ping });
});

trackingRouter.get("/orders/:id", (req, res) => {
  const o = getOrder(req.params.id);
  if (!o) return res.status(404).json({ error: "order not found" });
  res.json({ orderId: o.id, tracking: isTracking(o.id), pings: getPings(o.id) });
});
