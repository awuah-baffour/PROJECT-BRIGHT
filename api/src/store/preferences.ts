import { prisma } from "../db.js";

// Explicit substitution preferences (opt-in only). No auto-apply without
// approval until the trust threshold is met (plan 8 guardrail).
export interface Preference {
  locationId: string;
  productName: string;
  preferredSupplierId: string | null;
  autoApproveEquivalent: boolean;
}

function toPref(row: {
  locationId: string;
  productName: string;
  preferredSupplierId: string | null;
  autoApprove: boolean;
}): Preference {
  return {
    locationId: row.locationId,
    productName: row.productName,
    preferredSupplierId: row.preferredSupplierId,
    autoApproveEquivalent: row.autoApprove,
  };
}

export async function setPreference(p: Preference): Promise<Preference> {
  const row = await prisma.preference.upsert({
    where: { locationId_productName: { locationId: p.locationId, productName: p.productName } },
    create: {
      id: `prf_${Math.random().toString(36).slice(2, 9)}`,
      locationId: p.locationId,
      productName: p.productName,
      preferredSupplierId: p.preferredSupplierId,
      autoApprove: p.autoApproveEquivalent,
    },
    update: { preferredSupplierId: p.preferredSupplierId, autoApprove: p.autoApproveEquivalent },
  });
  return toPref(row);
}

export async function getPreferences(locationId: string): Promise<Preference[]> {
  const rows = await prisma.preference.findMany({ where: { locationId } });
  return rows.map(toPref);
}

export async function getAllPreferences(): Promise<Preference[]> {
  const rows = await prisma.preference.findMany();
  return rows.map(toPref);
}

export function preferredSupplierFor(
  all: Preference[],
  locationId: string,
  productName: string,
): string | null {
  const p = all.find((x) => x.locationId === locationId && x.productName.toLowerCase() === productName.toLowerCase());
  return p?.preferredSupplierId ?? null;
}
