// Phase 1 seed: approved supplier network + prices in pesewas (GH₵1 = 100)
// PRD 9.3 suppliers set own prices. Availability checked before payment (PRD 10).
export interface SeedProduct {
  id: string;
  supplierId: string;
  name: string;
  variant?: string;
  unit: string;
  price: number;
  inStock: number;
}

export interface SeedSupplier {
  id: string;
  name: string;
  approved: boolean;
  rating: number;
}

export const suppliers: SeedSupplier[] = [
  { id: "sup_melcom", name: "Melcom Distributor", approved: true, rating: 4.8 },
  { id: "sup_unilever", name: "Unilever Agent Accra", approved: true, rating: 4.6 },
  { id: "sup_ghanafoods", name: "Ghana Foods Ltd", approved: true, rating: 4.2 },
  { id: "sup_unapproved", name: "Unverified Trader", approved: false, rating: 3.1 },
];

export const products: SeedProduct[] = [
  { id: "p_rice_melcom", supplierId: "sup_melcom", name: "Rice", variant: "Royal Aroma 50kg", unit: "bag", price: 49000, inStock: 40 },
  { id: "p_rice_ghana", supplierId: "sup_ghanafoods", name: "Rice", variant: "Ghana Pride 50kg", unit: "bag", price: 46500, inStock: 12 },
  { id: "p_oil_unilever", supplierId: "sup_unilever", name: "Cooking Oil", variant: "Sunlight 5L", unit: "bottle", price: 4500, inStock: 100 },
  { id: "p_oil_ghana", supplierId: "sup_ghanafoods", name: "Cooking Oil", variant: "Local Palm 5L", unit: "bottle", price: 3800, inStock: 3 },
  { id: "p_sugar_melcom", supplierId: "sup_melcom", name: "Sugar", variant: "50kg", unit: "bag", price: 32000, inStock: 0 },
  { id: "p_sugar_ghana", supplierId: "sup_ghanafoods", name: "Sugar", variant: "50kg", unit: "bag", price: 33500, inStock: 20 },
  { id: "p_milk_unilever", supplierId: "sup_unilever", name: "Milk", variant: "Peak 400g x12", unit: "carton", price: 18000, inStock: 25 },
];
