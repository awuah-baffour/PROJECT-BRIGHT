export interface OrderEvent {
  orderId: string;
  type: string;
  at: string;
  detail?: unknown;
}

const events: OrderEvent[] = [];

export function logEvent(orderId: string, type: string, detail?: unknown): OrderEvent {
  const e = { orderId, type, at: new Date().toISOString(), detail };
  events.push(e);
  return e;
}

export function timeline(orderId: string): OrderEvent[] {
  return events.filter((e) => e.orderId === orderId);
}
