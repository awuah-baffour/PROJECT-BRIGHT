import { Router } from "express";
import { ah } from "../core/async.js";
import { loadCatalog } from "../core/sourcing.js";

export const catalogRouter = Router();

catalogRouter.get(
  "/products",
  ah(async (_req, res) => {
    const catalog = await loadCatalog();
    res.json(
      catalog.products
        .filter((product) => catalog.suppliers.find((supplier) => supplier.id === product.supplierId)?.approved)
        .map((product) => ({
          ...product,
          supplierName: catalog.suppliers.find((supplier) => supplier.id === product.supplierId)!.name,
        })),
    );
  }),
);

catalogRouter.get(
  "/search",
  ah(async (req, res) => {
    const q = String(req.query.q ?? "").trim().toLowerCase();
    if (!q) return res.status(400).json({ error: "q required" });
    const catalog = await loadCatalog();
    const results = catalog.products
      .filter((product) => catalog.suppliers.find((supplier) => supplier.id === product.supplierId)?.approved)
      .filter((product) => product.name.toLowerCase().includes(q) || (product.variant ?? "").toLowerCase().includes(q))
      .map((product) => ({
        ...product,
        supplierName: catalog.suppliers.find((supplier) => supplier.id === product.supplierId)!.name,
      }));
    res.json({ query: req.query.q, results, sourcingBacklogLogged: results.length === 0 });
  }),
);
