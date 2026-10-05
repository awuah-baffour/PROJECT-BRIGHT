import { makeId } from "./orders.js";

// Phase 2: richer recurring orders - schedule, pause, skip, run-now.
export interface Recurring {
  id: string;
  sourceOrderId: string;
  items: { name: string; qty: number }[];
  deliveryLocationId: string;
  frequency: "weekly" | "biweekly";
  nextRun: string;
  paused: boolean;
  createdAt: string;
}

const schedules = new Map<string, Recurring>();

export function saveRecurring(r: Recurring): void {
  schedules.set(r.id, r);
}
export function getRecurring(id: string): Recurring | undefined {
  return schedules.get(id);
}
export function listRecurring(): Recurring[] {
  return [...schedules.values()];
}
export function newRecurringId(): string {
  return makeId("rec");
}
