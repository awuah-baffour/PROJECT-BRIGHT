import { Router } from "express";
import { ah } from "../core/async.js";
import { prisma } from "../db.js";
import { authRequired, createSession, digestToken, hashPassword, requireRoles, verifyPassword } from "./auth.js";

export const identityRouter = Router();

const roles = ["retailer_owner", "retailer_manager", "retailer_staff", "supplier", "admin"] as const;
const phoneVerificationMessage = "Phone verification will be available when SMS is connected.";
const loginAttemptLimit = 5;
const loginWindowMs = 15 * 60 * 1000;
const failedLogins = new Map<string, { count: number; resetAt: number }>();

export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\+?[0-9\s().-]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return `+233${digits.slice(1)}`;
  if (digits.length === 9) return `+233${digits}`;
  return `+${digits}`;
}

function passwordIsValid(password: unknown): password is string {
  return typeof password === "string" && password.length >= 12 && password.length <= 128;
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

async function createAccountSession(userId: string) {
  return createSession(userId);
}

function loginAttemptKey(req: import("express").Request): string {
  const address = req.ip || req.socket.remoteAddress || "unknown";
  return `${address}:${normalizePhone(req.body?.phone) ?? "invalid-phone"}`;
}

function loginRateLimit(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction): void {
  const key = loginAttemptKey(req);
  const attempt = failedLogins.get(key);
  const now = Date.now();
  if (attempt && attempt.resetAt > now && attempt.count >= loginAttemptLimit) {
    res.set("Retry-After", String(Math.ceil((attempt.resetAt - now) / 1000)));
    res.status(429).json({ error: "too many login attempts; try again later" });
    return;
  }
  next();
}

function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const previous = failedLogins.get(ip);
  if (!previous || previous.resetAt <= now) {
    failedLogins.set(ip, { count: 1, resetAt: now + loginWindowMs });
  } else {
    previous.count += 1;
  }
  if (failedLogins.size > 5000) {
    for (const [key, value] of failedLogins) {
      if (value.resetAt <= now) failedLogins.delete(key);
    }
    while (failedLogins.size > 5000) {
      const oldest = failedLogins.keys().next().value;
      if (oldest === undefined) break;
      failedLogins.delete(oldest);
    }
  }
}

identityRouter.get("/roles", (_req, res) => {
  res.json({ roles });
});

identityRouter.post(
  "/retailers/register",
  ah(async (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    const shopName = typeof req.body?.shopName === "string" ? req.body.shopName.trim() : "";
    const address = typeof req.body?.address === "string" ? req.body.address.trim() : "";
    const landmark = typeof req.body?.landmark === "string" ? req.body.landmark.trim() : "";
    const deliveryNotes = typeof req.body?.deliveryNotes === "string" ? req.body.deliveryNotes.trim() : undefined;
    const password = req.body?.password;

    if (!phone || !shopName || !address || !landmark || !passwordIsValid(password)) {
      return res.status(400).json({
        error: "phone, password (12-128 characters), shopName, address, and landmark are required",
      });
    }

    try {
      const passwordHash = await hashPassword(password);
      const retailer = await prisma.retailer.create({
        data: {
          phone,
          shopName,
          locations: { create: { address, landmark, deliveryNotes } },
          users: { create: { phone, passwordHash, role: "retailer_owner" } },
        },
        include: { users: { select: { id: true, phone: true, role: true, phoneVerified: true } }, locations: true },
      });
      const user = retailer.users[0];
      const token = await createAccountSession(user.id);
      res.status(201).json({
        token,
        user,
        retailer: { id: retailer.id, shopName: retailer.shopName, locations: retailer.locations },
        verification: { phoneVerified: false, message: phoneVerificationMessage },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) return res.status(409).json({ error: "an account already uses this phone number" });
      throw error;
    }
  }),
);

identityRouter.post(
  "/suppliers/register",
  ah(async (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    const businessName = typeof req.body?.businessName === "string" ? req.body.businessName.trim() : "";
    const password = req.body?.password;
    if (!phone || !businessName || !passwordIsValid(password)) {
      return res.status(400).json({ error: "phone, password (12-128 characters), and businessName are required" });
    }

    try {
      const passwordHash = await hashPassword(password);
      const supplier = await prisma.supplier.create({
        data: {
          name: businessName,
          approved: false,
          onboardingStatus: "pending",
          users: { create: { phone, passwordHash, role: "supplier" } },
        },
        include: { users: { select: { id: true, phone: true, role: true, phoneVerified: true } } },
      });
      const user = supplier.users[0];
      const token = await createAccountSession(user.id);
      res.status(201).json({
        token,
        user,
        supplier: { id: supplier.id, name: supplier.name, approved: supplier.approved, onboardingStatus: supplier.onboardingStatus },
        verification: { phoneVerified: false, message: phoneVerificationMessage },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) return res.status(409).json({ error: "an account already uses this phone number" });
      throw error;
    }
  }),
);

identityRouter.post(
  "/login",
  loginRateLimit,
  ah(async (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    const password = req.body?.password;
    if (!phone || typeof password !== "string") return res.status(400).json({ error: "phone and password are required" });

    const user = await prisma.user.findUnique({
      where: { phone },
      include: {
        retailer: {
          select: {
            shopName: true,
            locations: { select: { id: true, address: true, landmark: true, deliveryNotes: true } },
          },
        },
        supplier: { select: { name: true, approved: true, onboardingStatus: true } },
      },
    });
    const valid = user ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !valid) {
      recordFailedLogin(loginAttemptKey(req));
      return res.status(401).json({ error: "invalid phone or password" });
    }
    if (!user.active) return res.status(403).json({ error: "account is disabled" });

    failedLogins.delete(loginAttemptKey(req));
    const token = await createAccountSession(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        phoneVerified: user.phoneVerified,
        retailerId: user.retailerId,
        supplierId: user.supplierId,
      },
      retailer: user.retailer ? { shopName: user.retailer.shopName, locations: user.retailer.locations } : null,
      supplier: user.supplier ? {
        name: user.supplier.name,
        approved: user.supplier.approved,
        onboardingStatus: user.supplier.onboardingStatus,
      } : null,
      verification: user.phoneVerified ? null : { phoneVerified: false, message: phoneVerificationMessage },
    });
  }),
);

identityRouter.get(
  "/me",
  authRequired,
  ah(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
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
        retailer: {
          select: {
            shopName: true,
            locations: { select: { id: true, address: true, landmark: true, deliveryNotes: true } },
          },
        },
        supplier: { select: { name: true, approved: true, onboardingStatus: true } },
      },
    });
    if (!user) return res.status(404).json({ error: "account not found" });
    const { retailer, supplier, ...profile } = user;
    res.json({
      user: profile,
      retailer: retailer ? { shopName: retailer.shopName, locations: retailer.locations } : null,
      supplier,
    });
  }),
);

identityRouter.post(
  "/logout",
  authRequired,
  ah(async (req, res) => {
    const authorization = req.get("authorization") ?? "";
    const token = authorization.slice("Bearer ".length);
    await prisma.session.deleteMany({ where: { tokenHash: digestToken(token) } });
    res.json({ ok: true });
  }),
);

identityRouter.post(
  "/staff",
  authRequired,
  requireRoles("retailer_owner", "retailer_manager"),
  ah(async (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    const password = req.body?.password;
    const role = req.body?.role;
    const dailyCap = req.body?.dailyCap;
    const perOrderCap = req.body?.perOrderCap;
    if (!phone || !passwordIsValid(password) || !["retailer_manager", "retailer_staff"].includes(role)) {
      return res.status(400).json({ error: "phone, password (12-128 characters), and role retailer_manager|retailer_staff are required" });
    }
    if (req.user?.role === "retailer_manager" && role !== "retailer_staff") {
      return res.status(403).json({ error: "managers can only create staff accounts" });
    }
    if (!req.user?.retailerId) return res.status(403).json({ error: "retailer profile is not linked to this account" });
    for (const [name, value] of [["dailyCap", dailyCap], ["perOrderCap", perOrderCap]] as const) {
      if (value !== undefined && (!Number.isSafeInteger(value) || value < 0 || value > 2_147_483_647)) {
        return res.status(400).json({ error: `${name} must be a non-negative integer` });
      }
    }
    try {
      const user = await prisma.user.create({
        data: {
          phone,
          passwordHash: await hashPassword(password),
          role,
          retailerId: req.user!.retailerId,
          dailyCap: dailyCap ?? null,
          perOrderCap: perOrderCap ?? null,
        },
        select: { id: true, phone: true, role: true, phoneVerified: true, dailyCap: true, perOrderCap: true },
      });
      res.status(201).json({ user, verification: { phoneVerified: false, message: phoneVerificationMessage } });
    } catch (error) {
      if (isUniqueConstraintError(error)) return res.status(409).json({ error: "an account already uses this phone number" });
      throw error;
    }
  }),
);

export async function bootstrapAdminFromEnvironment(): Promise<void> {
  const phoneValue = process.env.ADMIN_BOOTSTRAP_PHONE;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!phoneValue && !password) return;
  const phone = normalizePhone(phoneValue);
  if (!phone || !passwordIsValid(password)) {
    throw new Error("Set both ADMIN_BOOTSTRAP_PHONE and ADMIN_BOOTSTRAP_PASSWORD (12-128 characters) to provision the first admin.");
  }
  const existing = await prisma.user.findUnique({ where: { phone }, select: { role: true } });
  if (existing) {
    if (existing.role !== "admin") throw new Error("The configured admin bootstrap phone is already assigned to a non-admin account.");
    return;
  }
  await prisma.user.create({ data: { phone, passwordHash: await hashPassword(password), role: "admin" } });
  console.log("Bootstrapped the configured admin account.");
}
