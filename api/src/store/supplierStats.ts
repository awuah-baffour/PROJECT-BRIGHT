import { suppliers } from "../data/seed.js";

// Phase 2: supplier quality scoring from live confirm/reject + ratings.
// Score blends base rating, user ratings, and confirmation rate.
interface Stat {
  assigned: number;
  confirmed: number;
  rejected: number;
  ratingSum: number;
  ratingCount: number;
}

const stats = new Map<string, Stat>();

function stat(id: string): Stat {
  let s = stats.get(id);
  if (!s) {
    s = { assigned: 0, confirmed: 0, rejected: 0, ratingSum: 0, ratingCount: 0 };
    stats.set(id, s);
  }
  return s;
}

export function recordAssign(supplierId: string): void {
  stat(supplierId).assigned += 1;
}
export function recordConfirm(supplierId: string): void {
  const s = stat(supplierId);
  s.confirmed += 1;
  if (s.assigned < s.confirmed) s.assigned = s.confirmed;
}
export function recordReject(supplierId: string): void {
  const s = stat(supplierId);
  s.rejected += 1;
  if (s.assigned < s.confirmed + s.rejected) s.assigned = s.confirmed + s.rejected;
}
export function addRating(supplierId: string, score: number): void {
  const s = stat(supplierId);
  s.ratingSum += score;
  s.ratingCount += 1;
}

export function confirmationRate(supplierId: string): number {
  const s = stats.get(supplierId);
  if (!s || s.assigned === 0) return 1;
  return s.confirmed / s.assigned;
}

export function supplierScore(supplierId: string): number {
  const base = suppliers.find((s) => s.id === supplierId)?.rating ?? 3;
  const s = stats.get(supplierId);
  const userAvg = s && s.ratingCount > 0 ? s.ratingSum / s.ratingCount : base;
  const blended = 0.6 * base + 0.4 * userAvg;
  const conf = confirmationRate(supplierId);
  return blended * (0.7 + 0.3 * conf);
}

export function supplierStats(): Record<string, Stat & { score: number; confirmationRate: number }> {
  const out: Record<string, Stat & { score: number; confirmationRate: number }> = {};
  for (const sup of suppliers) {
    const s = stats.get(sup.id) ?? { assigned: 0, confirmed: 0, rejected: 0, ratingSum: 0, ratingCount: 0 };
    out[sup.id] = { ...s, score: supplierScore(sup.id), confirmationRate: confirmationRate(sup.id) };
  }
  return out;
}
