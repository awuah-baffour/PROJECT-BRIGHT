// Phase 3: outbound fulfillment pilot (PRD 9.11). Manual entry first, no channel
// auto-integrations. Partner FC inventory comes later - pickup location only.
export type OutboundChannel = "whatsapp" | "phone" | "social" | "website" | "manual";
export type OutboundService = "delivery_only" | "pick_pack_delivery";
export type OutboundStatus = "created" | "assigned" | "picked_up" | "delivered" | "cancelled";

export interface OutboundOrder {
  id: string;
  sourceChannel: OutboundChannel;
  serviceType: OutboundService;
  pickupNote: string;
  customerName: string;
  customerPhone: string;
  dropoffAddress: string;
  landmark: string;
  packageNote: string;
  codAmount: number;
  status: OutboundStatus;
  rider: string | null;
  proof: { recipient: string; at: string } | null;
  createdAt: string;
}

const outbound = new Map<string, OutboundOrder>();

export function saveOutbound(o: OutboundOrder): void {
  outbound.set(o.id, o);
}
export function getOutbound(id: string): OutboundOrder | undefined {
  return outbound.get(id);
}
export function listOutbound(): OutboundOrder[] {
  return [...outbound.values()];
}
export function newOutboundId(): string {
  return `ob_${Math.random().toString(36).slice(2, 9)}`;
}
