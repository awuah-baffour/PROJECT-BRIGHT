import { prisma } from "../db.js";

// Richer recurring orders: schedule, pause, skip, run-now.
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

function toRecurring(row: {
  id: string;
  sourceOrderId: string;
  items: string;
  deliveryLocationId: string;
  frequency: string;
  nextRun: Date;
  paused: boolean;
  createdAt: Date;
}): Recurring {
  return {
    id: row.id,
    sourceOrderId: row.sourceOrderId,
    items: JSON.parse(row.items) as { name: string; qty: number }[],
    deliveryLocationId: row.deliveryLocationId,
    frequency: row.frequency as "weekly" | "biweekly",
    nextRun: row.nextRun.toISOString(),
    paused: row.paused,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function saveRecurring(r: Recurring): Promise<void> {
  await prisma.recurring.upsert({
    where: { id: r.id },
    create: {
      id: r.id,
      sourceOrderId: r.sourceOrderId,
      items: JSON.stringify(r.items),
      deliveryLocationId: r.deliveryLocationId,
      frequency: r.frequency,
      nextRun: new Date(r.nextRun),
      paused: r.paused,
    },
    update: { nextRun: new Date(r.nextRun), paused: r.paused },
  });
}

export async function getRecurring(id: string): Promise<Recurring | undefined> {
  const row = await prisma.recurring.findUnique({ where: { id } });
  return row ? toRecurring(row) : undefined;
}

export async function listRecurring(): Promise<Recurring[]> {
  const rows = await prisma.recurring.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toRecurring);
}

export function newRecurringId(): string {
  return `rec_${Math.random().toString(36).slice(2, 9)}`;
}
