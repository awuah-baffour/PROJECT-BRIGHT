import { prisma } from "../db.js";

export interface OrderEvent {
  orderId: string;
  type: string;
  at: string;
  detail?: unknown;
}

export async function logEvent(orderId: string, type: string, detail?: unknown): Promise<OrderEvent> {
  const row = await prisma.event.create({ data: { orderId, type, payload: JSON.stringify(detail ?? null) } });
  return { orderId, type, at: row.createdAt.toISOString(), detail };
}

export async function timeline(orderId: string): Promise<OrderEvent[]> {
  const rows = await prisma.event.findMany({ where: { orderId }, orderBy: { createdAt: "asc" } });
  return rows.map((r) => ({
    orderId: r.orderId ?? "",
    type: r.type,
    at: r.createdAt.toISOString(),
    detail: JSON.parse(r.payload) as unknown,
  }));
}
