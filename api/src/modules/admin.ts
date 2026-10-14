import { Router } from "express";
import { ah } from "../core/async.js";
import { orderCounts } from "../store/orders.js";
import { prisma } from "../db.js";
import { authRequired, hashPassword, requireRoles } from "./auth.js";
import { normalizePhone } from "./identity.js";

export const adminRouter = Router();
adminRouter.use(authRequired, requireRoles("admin"));

adminRouter.get(
  "/dashboard",
  ah(async (_req, res) => {
    const [retailers, suppliersPending, suppliersApproved, suppliersRejected, openIssues, orders] = await Promise.all([
      prisma.retailer.count(),
      prisma.supplier.count({ where: { onboardingStatus: "pending" } }),
      prisma.supplier.count({ where: { onboardingStatus: "approved" } }),
      prisma.supplier.count({ where: { onboardingStatus: "rejected" } }),
      prisma.issue.count({ where: { status: "open" } }),
      orderCounts(),
    ]);
    res.json({
      retailers,
      suppliers: { pending: suppliersPending, approved: suppliersApproved, rejected: suppliersRejected },
      orders: orders.orders,
      quotedOrderValuePesewas: orders.gmv,
      openIssues,
    });
  }),
);

adminRouter.get(
  "/suppliers",
  ah(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    if (status && !["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "status must be pending, approved, or rejected" });
    }
    const suppliers = await prisma.supplier.findMany({
      where: status ? { onboardingStatus: status } : undefined,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        approved: true,
        onboardingStatus: true,
        rating: true,
        users: { select: { id: true, phone: true, active: true, createdAt: true } },
      },
    });
    res.json({ suppliers });
  }),
);

adminRouter.patch(
  "/suppliers/:id/review",
  ah(async (req, res) => {
    const status = req.body?.status;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "status must be approved or rejected" });
    }
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: { onboardingStatus: status, approved: status === "approved" },
      select: { id: true, name: true, approved: true, onboardingStatus: true },
    }).catch((error: unknown) => {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") return null;
      throw error;
    });
    if (!supplier) return res.status(404).json({ error: "supplier not found" });
    res.json({ supplier });
  }),
);

adminRouter.get(
  "/retailers",
  ah(async (_req, res) => {
    const retailers = await prisma.retailer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        users: { select: { id: true, phone: true, role: true, phoneVerified: true, active: true, createdAt: true } },
        locations: true,
      },
    });
    res.json({ retailers });
  }),
);

adminRouter.get(
  "/orders",
  ah(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const orders = await prisma.orderDoc.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({
      orders: orders.map((order) => ({
        id: order.id,
        status: order.status,
        total: order.total,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        data: JSON.parse(order.data),
      })),
    });
  }),
);

adminRouter.get(
  "/accounts",
  ah(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        phone: true,
        role: true,
        phoneVerified: true,
        active: true,
        retailerId: true,
        supplierId: true,
        dailyCap: true,
        perOrderCap: true,
        createdAt: true,
      },
    });
    res.json({ accounts: users });
  }),
);

adminRouter.post(
  "/admins",
  ah(async (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    const password = req.body?.password;
    if (!phone || typeof password !== "string" || password.length < 12 || password.length > 128) {
      return res.status(400).json({ error: "phone and password (12-128 characters) are required" });
    }
    try {
      const user = await prisma.user.create({
        data: { phone, passwordHash: await hashPassword(password), role: "admin" },
        select: { id: true, phone: true, role: true, active: true, createdAt: true },
      });
      res.status(201).json({ user });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
        return res.status(409).json({ error: "an account already uses this phone number" });
      }
      throw error;
    }
  }),
);
