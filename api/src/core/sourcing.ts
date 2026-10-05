import { products, suppliers } from "../data/seed.js";
import { supplierScore } from "../store/supplierStats.js";

// PRD 9.3: compare approved suppliers, recommend best, retailer can override.
// PRD 9.4: partial fill + alternatives, no silent material substitution.
export interface RequestedItem {
  name: string;
  qty: number;
}

export interface QuoteLine {
  requestedName: string;
  qtyRequested: number;
  productId: string;
  productName: string;
  variant?: string;
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  qtyFulfilled: number;
  lineTotal: number;
  partial: boolean;
}

export interface Slice {
  supplierId: string;
  supplierName: string;
  items: QuoteLine[];
  sliceTotal: number;
}

export interface Unavailable {
  requestedName: string;
  qtyRequested: number;
  reason: string;
  alternatives: { productId: string; productName: string; supplierName: string; unitPrice: number; inStock: number }[];
}

export interface Quote {
  lines: QuoteLine[];
  slices: Slice[];
  unavailable: Unavailable[];
  subtotal: number;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function buildQuote(requested: RequestedItem[]): Quote {
  const lines: QuoteLine[] = [];
  const unavailable: Unavailable[] = [];

  for (const r of requested) {
    const q = norm(r.name);
    const candidates = products
      .filter((p) => norm(p.name).includes(q) || q.includes(norm(p.name)))
      .filter((p) => suppliers.find((s) => s.id === p.supplierId)?.approved)
      .sort((a, b) => {
        const aFull = a.inStock >= r.qty ? 0 : 1;
        const bFull = b.inStock >= r.qty ? 0 : 1;
        if (aFull !== bFull) return aFull - bFull;
        // Phase 2: value score blends live supplier quality with price.
        // Higher score wins; price breaks near-ties (500 pts ~ GH₵5 sensitivity).
        const av = supplierScore(a.supplierId) * 1000 - a.price / 50;
        const bv = supplierScore(b.supplierId) * 1000 - b.price / 50;
        return bv - av;
      });

    if (candidates.length === 0) {
      unavailable.push({ requestedName: r.name, qtyRequested: r.qty, reason: "no approved supplier", alternatives: [] });
      continue;
    }
    const best = candidates[0];
    const sup = suppliers.find((s) => s.id === best.supplierId)!;
    if (best.inStock <= 0) {
      const alts = candidates
        .filter((c) => c.inStock > 0)
        .slice(0, 3)
        .map((c) => ({
          productId: c.id,
          productName: `${c.name}${c.variant ? ` ${c.variant}` : ""}`,
          supplierName: suppliers.find((s) => s.id === c.supplierId)!.name,
          unitPrice: c.price,
          inStock: c.inStock,
        }));
      unavailable.push({ requestedName: r.name, qtyRequested: r.qty, reason: `out of stock at ${sup.name}`, alternatives: alts });
      continue;
    }
    const fulfilled = Math.min(r.qty, best.inStock);
    lines.push({
      requestedName: r.name,
      qtyRequested: r.qty,
      productId: best.id,
      productName: `${best.name}${best.variant ? ` ${best.variant}` : ""}`,
      variant: best.variant,
      supplierId: best.supplierId,
      supplierName: sup.name,
      unitPrice: best.price,
      qtyFulfilled: fulfilled,
      lineTotal: best.price * fulfilled,
      partial: fulfilled < r.qty,
    });
    if (fulfilled < r.qty) {
      const alts = candidates
        .filter((c) => c.id !== best.id && c.inStock > 0)
        .slice(0, 3)
        .map((c) => ({
          productId: c.id,
          productName: `${c.name}${c.variant ? ` ${c.variant}` : ""}`,
          supplierName: suppliers.find((s) => s.id === c.supplierId)!.name,
          unitPrice: c.price,
          inStock: c.inStock,
        }));
      unavailable.push({ requestedName: r.name, qtyRequested: r.qty - fulfilled, reason: "partial fill", alternatives: alts });
    }
  }

  const sliceMap = new Map<string, Slice>();
  for (const l of lines) {
    const s = sliceMap.get(l.supplierId) ?? { supplierId: l.supplierId, supplierName: l.supplierName, items: [], sliceTotal: 0 };
    s.items.push(l);
    s.sliceTotal += l.lineTotal;
    sliceMap.set(l.supplierId, s);
  }
  const slices = [...sliceMap.values()];
  const subtotal = lines.reduce((t, l) => t + l.lineTotal, 0);
  return { lines, slices, unavailable, subtotal };
}

export function findAlternatives(productId: string, limit = 3) {
  const current = products.find((p) => p.id === productId);
  if (!current) return [];
  return products
    .filter((p) => p.id !== productId && p.name === current.name)
    .filter((p) => suppliers.find((s) => s.id === p.supplierId)?.approved)
    .filter((p) => p.inStock > 0)
    .sort((a, b) => a.price - b.price)
    .slice(0, limit)
    .map((p) => ({
      productId: p.id,
      productName: `${p.name}${p.variant ? ` ${p.variant}` : ""}`,
      supplierId: p.supplierId,
      supplierName: suppliers.find((s) => s.id === p.supplierId)!.name,
      unitPrice: p.price,
      inStock: p.inStock,
    }));
}
