import { Router } from "express";
import { ah } from "../core/async.js";
import { prisma } from "../db.js";
import { authRequired, requireRoles } from "./auth.js";

export const suppliersRouter = Router();

suppliersRouter.use(authRequired, requireRoles("supplier"));

suppliersRouter.get(
  "/me",
  ah(async (req, res) => {
    const supplierId = req.user?.supplierId;
    if (!supplierId) return res.status(403).json({ error: "supplier profile is not linked to this account" });
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, name: true, approved: true, onboardingStatus: true, rating: true },
    });
    if (!supplier) return res.status(404).json({ error: "supplier profile not found" });
    res.json({ supplier });
  }),
);

suppliersRouter.get(
  "/dashboard",
  ah(async (req, res) => {
    const supplierId = req.user?.supplierId;
    if (!supplierId) return res.status(403).json({ error: "supplier profile is not linked to this account" });
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, name: true, approved: true, onboardingStatus: true },
    });
    if (!supplier) return res.status(404).json({ error: "supplier profile not found" });
    const orderDocs = supplier.approved
      ? await prisma.orderDoc.findMany({
          where: { status: { in: ["paid", "sourcing", "preparing", "ready", "picked_up", "consolidated", "dispatched"] } },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : [];
    const assignedSlices = orderDocs.flatMap((order) => {
      const data = JSON.parse(order.data) as { slices?: Array<Record<string, unknown> & { supplierId?: string }> };
      return (data.slices ?? [])
        .filter((slice) => slice.supplierId === supplier.id)
        .map((slice) => ({ orderId: order.id, orderStatus: order.status, ...slice }));
    });
    res.json({
      supplier,
      assignedSlices,
      integrations: { whatsapp: "coming_soon", payments: "coming_soon" },
    });
  }),
);

suppliersRouter.get(
  "/products",
  ah(async (req, res) => {
    const supplierId = req.user?.supplierId;
    if (!supplierId) return res.status(403).json({ error: "supplier profile is not linked to this account" });
    const products = await prisma.product.findMany({
      where: { supplierId },
      orderBy: { name: "asc" },
    });
    res.json({ products });
  }),
);

suppliersRouter.post(
  "/products",
  ah(async (req, res) => {
    const supplierId = req.user?.supplierId;
    if (!supplierId) return res.status(403).json({ error: "supplier profile is not linked to this account" });
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId }, select: { approved: true } });
    if (!supplier) return res.status(404).json({ error: "supplier profile not found" });
    if (!supplier.approved) return res.status(403).json({ error: "supplier approval is required before listing products" });

    const { name, variant, unit, price, inStock } = req.body ?? {};
    if (
      typeof name !== "string" || !name.trim() ||
      typeof unit !== "string" || !unit.trim() ||
      !Number.isSafeInteger(price) || price <= 0 || price > 2_147_483_647 ||
      !Number.isSafeInteger(inStock) || inStock < 0 || inStock > 2_147_483_647 ||
      (variant !== undefined && variant !== null && typeof variant !== "string")
    ) {
      return res.status(400).json({ error: "name, unit, positive integer price (pesewas), and non-negative integer inStock are required" });
    }
    const product = await prisma.product.create({
      data: {
        supplierId,
        name: name.trim(),
        variant: typeof variant === "string" && variant.trim() ? variant.trim() : null,
        unit: unit.trim(),
        price,
        inStock,
      },
    });
    res.status(201).json({ product });
  }),
);

suppliersRouter.patch(
  "/products/:id",
  ah(async (req, res) => {
    const supplierId = req.user?.supplierId;
    if (!supplierId) return res.status(403).json({ error: "supplier profile is not linked to this account" });
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, supplierId } });
    if (!existing) return res.status(404).json({ error: "product not found" });

    const updates: { name?: string; variant?: string | null; unit?: string; price?: number; inStock?: number } = {};
    const body = req.body ?? {};
    if ("name" in body) {
      if (typeof body.name !== "string" || !body.name.trim()) return res.status(400).json({ error: "name must be a non-empty string" });
      updates.name = body.name.trim();
    }
    if ("variant" in body) {
      if (body.variant !== null && typeof body.variant !== "string") return res.status(400).json({ error: "variant must be a string or null" });
      updates.variant = typeof body.variant === "string" && body.variant.trim() ? body.variant.trim() : null;
    }
    if ("unit" in body) {
      if (typeof body.unit !== "string" || !body.unit.trim()) return res.status(400).json({ error: "unit must be a non-empty string" });
      updates.unit = body.unit.trim();
    }
    if ("price" in body) {
      if (!Number.isSafeInteger(body.price) || body.price <= 0 || body.price > 2_147_483_647) return res.status(400).json({ error: "price must be a positive 32-bit integer in pesewas" });
      updates.price = body.price;
    }
    if ("inStock" in body) {
      if (!Number.isSafeInteger(body.inStock) || body.inStock < 0 || body.inStock > 2_147_483_647) return res.status(400).json({ error: "inStock must be a non-negative 32-bit integer" });
      updates.inStock = body.inStock;
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "provide at least one product field to update" });

    const product = await prisma.product.update({ where: { id: existing.id }, data: updates });
    res.json({ product });
  }),
);
