import { Router } from "express";

// Phase 0 stub: catalog search uses Postgres FTS + trigram in Phase 1 (AD-13)
// Unmatched queries go to sourcing backlog per PRD 9.2
export const catalogRouter = Router();

catalogRouter.get("/search", (req, res) => {
  const q = String(req.query.q ?? "");
  if (!q) return res.status(400).json({ error: "q required" });
  res.json({ query: q, results: [], sourcingBacklogLogged: true });
});
