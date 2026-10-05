// Phase 5: opt-in live tracking per order. Positions only recorded when the
// retailer enables tracking for that order (cost + privacy guardrail).
export interface Ping {
  lat: number;
  lng: number;
  at: string;
  stage?: string;
}

const enabled = new Set<string>();
const pings = new Map<string, Ping[]>();

export function enableTracking(orderId: string): void {
  enabled.add(orderId);
}
export function isTracking(orderId: string): boolean {
  return enabled.has(orderId);
}
export function addPing(orderId: string, p: Ping): void {
  const list = pings.get(orderId) ?? [];
  list.push(p);
  pings.set(orderId, list);
}
export function getPings(orderId: string): Ping[] {
  return pings.get(orderId) ?? [];
}
