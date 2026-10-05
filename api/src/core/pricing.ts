import type { Quote } from "./sourcing.js";

// PRD 9.6 itemized + single delivery fee. PRD decision 32: customer sees one
// fee, internal cost tracks multi-pickup complexity separately.
export const DELIVERY_BASE = 5000; // GH₵50 base
export const DELIVERY_PER_EXTRA_SUPPLIER = 3000; // GH₵30 per extra pickup (internal)

export interface PricedQuote extends Quote {
  deliveryFee: number;
  serviceFee: number;
  total: number;
  internalLogisticsCost: number;
  supplierAllocation: { supplierId: string; supplierName: string; amount: number }[];
}

export function priceQuote(q: Quote, opts?: { drops?: number }): PricedQuote {
  const supplierCount = q.slices.length;
  const drops = opts?.drops ?? 1;
  // Phase 5: one base fee per drop; internal cost still tracks pickup complexity.
  const deliveryFee = supplierCount === 0 ? 0 : DELIVERY_BASE * drops;
  const internalLogisticsCost =
    supplierCount === 0 ? 0 : (DELIVERY_BASE + Math.max(0, supplierCount - 1) * DELIVERY_PER_EXTRA_SUPPLIER) * drops;
  const serviceFee = 0;
  const total = q.subtotal + deliveryFee + serviceFee;
  const supplierAllocation = q.slices.map((s) => ({ supplierId: s.supplierId, supplierName: s.supplierName, amount: s.sliceTotal }));
  return { ...q, deliveryFee, serviceFee, total, internalLogisticsCost, supplierAllocation };
}
