import type { OrderStatus } from "../core/orderMachine.js";
import type { PricedQuote } from "../core/pricing.js";

// In-memory orders for Phase 1 (Postgres in Phase 0 schema when DATABASE_URL set).
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

const orders = new Map<string, OrderRecord>();

export function saveOrder(o: OrderRecord): void {
  orders.set(o.id, o);
}
export function getOrder(id: string): OrderRecord | undefined {
  return orders.get(id);
}
export function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
