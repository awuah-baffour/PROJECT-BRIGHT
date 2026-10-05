import { prisma } from "../db.js";

// Opt-in live tracking per order. Positions only recorded when enabled.
export interface Ping {
  lat: number;
  lng: number;
  at: string;
  stage?: string;
}

export async function enableTracking(orderId: string): Promise<void> {
  await prisma.tracking.upsert({
    where: { orderId },
    create: { orderId, pings: "[]" },
    update: {},
  });
}

export async function isTracking(orderId: string): Promise<boolean> {
  const row = await prisma.tracking.findUnique({ where: { orderId } });
  return row !== null;
}

export async function addPing(orderId: string, p: Ping): Promise<void> {
  const row = await prisma.tracking.findUnique({ where: { orderId } });
  const pings: Ping[] = row ? (JSON.parse(row.pings) as Ping[]) : [];
  pings.push(p);
  await prisma.tracking.update({ where: { orderId }, data: { pings: JSON.stringify(pings) } });
}

export async function getPings(orderId: string): Promise<Ping[]> {
  const row = await prisma.tracking.findUnique({ where: { orderId } });
  return row ? (JSON.parse(row.pings) as Ping[]) : [];
}
