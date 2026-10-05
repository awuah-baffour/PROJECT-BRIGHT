// Phase 4: explicit substitution preferences (opt-in only). No auto-apply
// without approval until trust threshold met (plan 8 guardrail).
export interface Preference {
  locationId: string;
  productName: string;
  preferredSupplierId: string | null;
  autoApproveEquivalent: boolean;
}

const prefs: Preference[] = [];

export function setPreference(p: Preference): Preference {
  const i = prefs.findIndex(
    (x) => x.locationId === p.locationId && x.productName.toLowerCase() === p.productName.toLowerCase(),
  );
  if (i === -1) prefs.push(p);
  else prefs[i] = p;
  return p;
}

export function getPreferences(locationId: string): Preference[] {
  return prefs.filter((p) => p.locationId === locationId);
}

export function preferredSupplierFor(locationId: string, productName: string): string | null {
  const p = prefs.find(
    (x) => x.locationId === locationId && x.productName.toLowerCase() === productName.toLowerCase(),
  );
  return p?.preferredSupplierId ?? null;
}
