import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { ah } from "../core/async.js";
import { prisma } from "../db.js";

export interface AuthenticatedUser {
  id: string;
  phone: string;
  role: string;
  phoneVerified: boolean;
  active: boolean;
  retailerId: string | null;
  supplierId: string | null;
  dailyCap: number | null;
  perOrderCap: number | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;

export function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => {
      if (error) return reject(error);
      resolve(`scrypt$${salt}$${key.toString("base64url")}`);
    });
  });
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, salt, stored] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !stored) return false;
  const expected = Buffer.from(stored, "base64url");
  const actual = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, expected.length, (error, key) => {
      if (error) return reject(error);
      resolve(key);
    });
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function digestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: {
      tokenHash: digestToken(token),
      userId,
      expiresAt: new Date(Date.now() + sessionLifetimeMs),
    },
  });
  return token;
}

export const authRequired: RequestHandler = ah(async (req, res, next) => {
  const authorization = req.get("authorization") ?? "";
  const match = authorization.match(/^Bearer ([A-Za-z0-9_-]{40,})$/);
  if (!match) return res.status(401).json({ error: "authentication required" });

  const session = await prisma.session.findUnique({
    where: { tokenHash: digestToken(match[1]) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    return res.status(401).json({ error: "session expired or invalid" });
  }
  if (!session.user.active) return res.status(403).json({ error: "account is disabled" });

  const { id, phone, role, phoneVerified, active, retailerId, supplierId, dailyCap, perOrderCap } = session.user;
  req.user = { id, phone, role, phoneVerified, active, retailerId, supplierId, dailyCap, perOrderCap };
  next();
});

export function requireRoles(...roles: string[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "authentication required" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "insufficient permissions" });
    next();
  };
}
