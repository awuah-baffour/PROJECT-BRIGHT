import { Router } from "express";
import { ah } from "../core/async.js";
import { suppliers } from "../data/seed.js";
import { getHistory } from "../store/history.js";
import { getPreferences, setPreference } from "../store/preferences.js";

// Phase 4: intelligence from history. Guardrail: at least 2 past purchases of
// a product before suggesting (plan 8). No auto-substitution without opt-in.
export const insightsRouter = Router();

const MIN_HISTORY = 2;

insightsRouter.get(
  "/replenish",
  ah(async (req, res) => {
    const locationId = String(req.query.locationId ?? "");
    if (!locationId) return res.status(400).json({ error: "locationId query required" });
    const purchases = await getHistory(locationId);
    const byProduct = new Map<string, { qty: number; at: string }[]>();
    for (const p of purchases) {
      const list = byProduct.get(p.productName.toLowerCase()) ?? [];
      list.push({ qty: p.qty, at: p.at });
      byProduct.set(p.productName.toLowerCase(), list);
    }
    const suggestions = [];
    for (const [name, rows] of byProduct) {
      if (rows.length < MIN_HISTORY) continue;
      const sorted = [...rows].sort((a, b) => a.at.localeCompare(b.at));
      const avgQty = Math.round(sorted.reduce((t, r) => t + r.qty, 0) / sorted.length);
      const intervals: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        intervals.push(new Date(sorted[i].at).getTime() - new Date(sorted[i - 1].at).getTime());
      }
      const avgIntervalMs = intervals.reduce((t, v) => t + v, 0) / intervals.length;
      const lastAt = sorted[sorted.length - 1].at;
      const dueAt = new Date(new Date(lastAt).getTime() + avgIntervalMs).toISOString();
      const dueNow = new Date().getTime() + 24 * 3600_000 >= new Date(dueAt).getTime();
      suggestions.push({
        productName: name,
        orders: rows.length,
        avgQty,
        avgIntervalDays: Math.round((avgIntervalMs / 86_400_000) * 10) / 10,
        lastOrderedAt: lastAt,
        dueAt,
        dueNow,
        suggestedQty: avgQty,
      });
    }
    res.json({ locationId, purchases: purchases.length, suggestions });
  }),
);

insightsRouter.get(
  "/preferences",
  ah(async (req, res) => {
    const locationId = String(req.query.locationId ?? "");
    if (!locationId) return res.status(400).json({ error: "locationId query required" });
    res.json({ locationId, preferences: await getPreferences(locationId) });
  }),
);

insightsRouter.post(
  "/preferences",
  ah(async (req, res) => {
    const { locationId, productName, preferredSupplierId, autoApproveEquivalent } = req.body ?? {};
    if (!locationId || !productName) return res.status(400).json({ error: "locationId and productName required" });
    if (preferredSupplierId && !suppliers.some((s) => s.id === preferredSupplierId)) {
      return res.status(404).json({ error: "supplier not found" });
    }
    const pref = await setPreference({
      locationId,
      productName,
      preferredSupplierId: preferredSupplierId ?? null,
      autoApproveEquivalent: autoApproveEquivalent === true,
    });
    res.json(pref);
  }),
);
