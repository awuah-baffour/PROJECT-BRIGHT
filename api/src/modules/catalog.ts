import { Router } from "express";
import { products, suppliers } from "../data/seed.js";

// Phase 0 stub: catalog search uses Postgres FTS + trigram in Phase 1 (AD-13)
// Unmatched queries go to sourcing backlog per PRD 9.2
// Phase 1: search in-memory seed (approved suppliers only).
export const catalogRouter = Router();

catalogRouter.get("/products", (_req, res) => {
  res.json(
    products
      .filter((p) => suppliers.find((s) => s.id === p.supplierId)?.approved)
      .map((p) => ({
        ...p,
        supplierName: suppliers.find((s) => s.id === p.supplierId)!.name,
      })),
  );
});

catalogRouter.get("/search", (req, res) => {
  const q = String(req.query.q ?? "").trim().toLowerCase();
  if (!q) return res.status(400).json({ error: "q required" });
  const results = products
    .filter((p) => suppliers.find((s) => s.id === p.supplierId)?.approved)
    .filter((p) => p.name.toLowerCase().includes(q) || (p.variant ?? "").toLowerCase().includes(q))
    .map((p) => ({
      ...p,
      supplierName: suppliers.find((s) => s.id === p.supplierId)!.name,
    }));
  res.json({ query: req.query.q, results, sourcingBacklogLogged: results.length === 0 });
});
