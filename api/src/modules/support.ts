import { Router } from "express";
import { ah } from "../core/async.js";
import { getOrder } from "../store/orders.js";
import { getIssue, issuesForOrder, newIssueId, saveIssue } from "../store/issues.js";
import { logEvent } from "../store/events.js";

// PRD 9.10: platform owns resolution. Replacement / partial / full refund from order.
export const supportRouter = Router();

supportRouter.post(
  "/orders/:id/issues",
  ah(async (req, res) => {
    const order = await getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "order not found" });
    const { type, detail } = req.body ?? {};
    if (!["missing", "damaged", "incorrect", "other"].includes(type)) {
      return res.status(400).json({ error: "type required: missing|damaged|incorrect|other" });
    }
    const issue = {
      id: newIssueId(),
      orderId: order.id,
      type,
      detail: detail ?? null,
      status: "open" as const,
      resolution: null,
      createdAt: new Date().toISOString(),
    };
    await saveIssue(issue);
    await logEvent(order.id, "issue.opened", { issueId: issue.id, type });
    res.json(issue);
  }),
);

supportRouter.get(
  "/orders/:id/issues",
  ah(async (req, res) => {
    const order = await getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "order not found" });
    res.json({ orderId: order.id, issues: await issuesForOrder(order.id) });
  }),
);

supportRouter.post(
  "/issues/:issueId/resolve",
  ah(async (req, res) => {
    const issue = await getIssue(req.params.issueId);
    if (!issue) return res.status(404).json({ error: "issue not found" });
    const { action, note } = req.body ?? {};
    if (!["replace", "partial_refund", "full_refund", "close"].includes(action)) {
      return res.status(400).json({ error: "action required: replace|partial_refund|full_refund|close" });
    }
    issue.status = action === "replace" ? "replaced" : action.includes("refund") ? "refunded" : "resolved";
    issue.resolution = note ?? action;
    await saveIssue(issue);
    await logEvent(issue.orderId, "issue.resolved", { issueId: issue.id, action });
    res.json(issue);
  }),
);
