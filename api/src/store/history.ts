import { prisma } from "../db.js";

// Purchase history per delivery location (retailer proxy until identity is
// wired to orders). Survives restarts via the Purchase table.
export interface Purchase {
  productName: string;
  qty: number;
  at: string;
}

export async function recordPurchase(
  locationId: string,
  lines: { requestedName: string; qtyFulfilled: number }[],
): Promise<void> {
  const rows = lines
    .filter((l) => l.qtyFulfilled > 0)
    .map((l) => ({
      id: `pur_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`,
      locationId,
      productName: l.requestedName,
      qty: l.qtyFulfilled,
    }));
  if (rows.length > 0) await prisma.purchase.createMany({ data: rows });
}

export async function getHistory(locationId: string): Promise<Purchase[]> {
  const rows = await prisma.purchase.findMany({ where: { locationId }, orderBy: { createdAt: "asc" } });
  return rows.map((r) => ({ productName: r.productName, qty: r.qty, at: r.createdAt.toISOString() }));
}
