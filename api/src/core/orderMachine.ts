// AD-06 order state machine. Single owner of transitions.
export type OrderStatus =
  | "draft" | "quoted" | "pending_payment" | "paid" | "sourcing"
  | "preparing" | "ready" | "picked_up" | "consolidated"
  | "dispatched" | "delivered" | "exception" | "cancelled" | "refunded";

const edges: Record<OrderStatus, OrderStatus[]> = {
  draft: ["quoted", "cancelled"],
  quoted: ["pending_payment", "cancelled"],
  pending_payment: ["paid", "cancelled"],
  paid: ["sourcing", "refunded"],
  sourcing: ["preparing", "exception"],
  preparing: ["ready", "exception"],
  ready: ["picked_up", "exception"],
  picked_up: ["consolidated", "dispatched", "exception"],
  consolidated: ["dispatched", "exception"],
  dispatched: ["delivered", "exception"],
  delivered: ["refunded"],
  exception: ["sourcing", "refunded", "cancelled"],
  cancelled: [],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return edges[from]?.includes(to) ?? false;
}
