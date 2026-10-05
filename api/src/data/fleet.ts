// Phase 5: broader 3PL network. Own capacity + approved third parties (PRD 9.8).
export interface Transporter {
  id: string;
  name: string;
  kind: "own" | "3pl";
  zone: string;
  active: boolean;
}

export const transporters: Transporter[] = [
  { id: "tr_own_1", name: "Bright Rider Team A", kind: "own", zone: "accra-central", active: true },
  { id: "tr_own_2", name: "Bright Van 02", kind: "own", zone: "accra-central", active: true },
  { id: "tr_3pl_stallion", name: "Stallion Logistics", kind: "3pl", zone: "accra-central", active: true },
  { id: "tr_3pl_inactive", name: "Suspended Hauler", kind: "3pl", zone: "accra-central", active: false },
];
