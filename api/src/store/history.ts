// Phase 4: purchase history per delivery location (retailer proxy until
// identity is wired to orders). In-memory; Postgres events table later.
export interface Purchase {
  productName: string;
  qty: number;
  at: string;
}

const history = new Map<string, Purchase[]>();

export function recordPurchase(locationId: string, lines: { requestedName: string; qtyFulfilled: number }[]): void {
  const list = history.get(locationId) ?? [];
  const now = new Date().toISOString();
  for (const l of lines) {
    if (l.qtyFulfilled > 0) list.push({ productName: l.requestedName, qty: l.qtyFulfilled, at: now });
  }
  history.set(locationId, list);
}

export function getHistory(locationId: string): Purchase[] {
  return history.get(locationId) ?? [];
}
