import { Router } from "express";
import { getOrder } from "../store/orders.js";
import { getIssue, issuesForOrder, saveIssue } from "../store/issues.js";
import { logEvent } from "../store/events.js";

// PRD 9.10: platform owns resolution. Replacement / partial / full refund from order.
export const supportRouter = Router();

function issueId(): string {
  return `iss_${Math.random().toString(36).slice(2, 9)}`;
}

supportRouter.post("/orders/:id/issues", (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: "order not found" });
  const { type, detail } = req.body ?? {};
  if (!["missing", "damaged", "incorrect", "other"].includes(type)) {
    return res.status(400).json({ error: "type required: missing|damaged|incorrect|other" });
  }
  const issue = {
    id: issueId(),
    orderId: order.id,
    type,
    detail: detail ?? null,
    status: "open" as const,
    resolution: null,
    createdAt: new Date().toISOString(),
  };
  saveIssue(issue);
  logEvent(order.id, "issue.opened", { issueId: issue.id, type });
  res.json(issue);
});

supportRouter.get("/orders/:id/issues", (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: "order not found" });
  res.json({ orderId: order.id, issues: issuesForOrder(order.id) });
});

supportRouter.post("/issues/:issueId/resolve", (req, res) => {
  const issue = getIssue(req.params.issueId);
  if (!issue) return res.status(404).json({ error: "issue not found" });
  const { action, note } = req.body ?? {};
  if (!["replace", "partial_refund", "full_refund", "close"].includes(action)) {
    return res.status(400).json({ error: "action required: replace|partial_refund|full_refund|close" });
  }
  issue.status = action === "replace" ? "replaced" : action.includes("refund") ? "refunded" : "resolved";
  issue.resolution = note ?? action;
  saveIssue(issue);
  logEvent(issue.orderId, "issue.resolved", { issueId: issue.id, action });
  res.json(issue);
});
