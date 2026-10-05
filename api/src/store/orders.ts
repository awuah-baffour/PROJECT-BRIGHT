import { prisma } from "../db.js";
import type { OrderStatus } from "../core/orderMachine.js";
import type { PricedQuote } from "../core/pricing.js";

// Orders live in OrderDoc so they survive restarts. The document holds
// everything the API needs; normalized Order/OrderSlice tables are populated
// later when the payments ledger goes live.
export interface SliceState {
  supplierId: string;
  supplierName: string;
  status: "assigned" | "confirmed" | "rejected" | "expired" | "resourced" | "dispatched" | "delivered";
  respondBy: string;
  transporterId?: string;
  items: PricedQuote["lines"];
  sliceTotal: number;
}

export interface OrderRecord {
  id: string;
  status: OrderStatus;
  deliveryLocationId: string;
  deliveryLocations: string[]; // Phase 5: one or more drops
  window: string | null;
  quote: PricedQuote;
  slices: SliceState[];
  createdAt: string;
}

export async function saveOrder(o: OrderRecord): Promise<void> {
  const { id, status, quote, ...rest } = o;
  await prisma.orderDoc.upsert({
    where: { id },
    create: { id, status, total: quote.total, data: JSON.stringify({ ...rest, quote }) },
    update: { status, total: quote.total, data: JSON.stringify({ ...rest, quote }) },
  });
}

export async function getOrder(id: string): Promise<OrderRecord | undefined> {
  const row = await prisma.orderDoc.findUnique({ where: { id } });
  if (!row) return undefined;
  const data = JSON.parse(row.data as string);
  return { id: row.id, status: row.status as OrderStatus, ...data };
}

export async function orderCounts(): Promise<{ orders: number; gmv: number }> {
  const agg = await prisma.orderDoc.aggregate({ _count: true, _sum: { total: true } });
  return { orders: agg._count, gmv: agg._sum.total ?? 0 };
}

export function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
