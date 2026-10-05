import { Router } from "express";

// PRD 9.10: platform owns resolution. Replacement / partial / full refund from order.
export const supportRouter = Router();

supportRouter.post("/orders/:id/issues", (req, res) => {
  const { type, detail } = req.body ?? {};
  if (!type) return res.status(400).json({ error: "type required: missing|damaged|incorrect|other" });
  res.json({ orderId: req.params.id, issueId: "iss_stub", type, detail: detail ?? null, status: "open" });
});
