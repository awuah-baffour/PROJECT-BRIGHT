import { prisma } from "../db.js";

// Outbound fulfillment pilot (PRD 9.11). Manual entry first.
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

function toOutbound(row: {
  id: string;
  sourceChannel: string;
  serviceType: string;
  pickupNote: string;
  customerName: string;
  customerPhone: string;
  dropoffAddress: string;
  landmark: string;
  packageNote: string;
  codAmount: number;
  status: string;
  rider: string | null;
  proofRecipient: string | null;
  proofAt: Date | null;
  createdAt: Date;
}): OutboundOrder {
  return {
    id: row.id,
    sourceChannel: row.sourceChannel as OutboundChannel,
    serviceType: row.serviceType as OutboundService,
    pickupNote: row.pickupNote,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    dropoffAddress: row.dropoffAddress,
    landmark: row.landmark,
    packageNote: row.packageNote,
    codAmount: row.codAmount,
    status: row.status as OutboundStatus,
    rider: row.rider,
    proof: row.proofRecipient ? { recipient: row.proofRecipient, at: row.proofAt!.toISOString() } : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function saveOutbound(o: OutboundOrder): Promise<void> {
  await prisma.outbound.upsert({
    where: { id: o.id },
    create: {
      id: o.id,
      sourceChannel: o.sourceChannel,
      serviceType: o.serviceType,
      pickupNote: o.pickupNote,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      dropoffAddress: o.dropoffAddress,
      landmark: o.landmark,
      packageNote: o.packageNote,
      codAmount: o.codAmount,
      status: o.status,
      rider: o.rider,
      proofRecipient: o.proof?.recipient ?? null,
      proofAt: o.proof ? new Date(o.proof.at) : null,
    },
    update: {
      status: o.status,
      rider: o.rider,
      proofRecipient: o.proof?.recipient ?? null,
      proofAt: o.proof ? new Date(o.proof.at) : null,
    },
  });
}

export async function getOutbound(id: string): Promise<OutboundOrder | undefined> {
  const row = await prisma.outbound.findUnique({ where: { id } });
  return row ? toOutbound(row) : undefined;
}

export async function listOutbound(): Promise<OutboundOrder[]> {
  const rows = await prisma.outbound.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toOutbound);
}

export function newOutboundId(): string {
  return `ob_${Math.random().toString(36).slice(2, 9)}`;
}
