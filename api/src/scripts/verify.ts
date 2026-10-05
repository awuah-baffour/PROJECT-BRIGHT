// Automatic safety checks. Run: npm run verify
// Covers the rules the business depends on (PRD 10): legal order moves,
// availability-before-payment math, no silent material substitution.
import assert from "node:assert";
import { addRating } from "../store/supplierStats.js";
import { canTransition } from "../core/orderMachine.js";
import { buildQuote } from "../core/sourcing.js";
import { priceQuote } from "../core/pricing.js";

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

// Order machine: money flows forward, never backward.
check("quoted -> pending_payment -> paid path is open", () => {
  assert.equal(canTransition("quoted", "pending_payment"), true);
  assert.equal(canTransition("pending_payment", "paid"), true);
});
check("paid -> quoted is blocked", () => {
  assert.equal(canTransition("paid", "quoted"), false);
});
check("delivered is terminal except refund", () => {
  assert.equal(canTransition("delivered", "refunded"), true);
  assert.equal(canTransition("delivered", "paid"), false);
});

// Sourcing: full stock first, then value = quality blended with price.
// Default scores: Melcom 4.8 beats Ghana 4.6 despite costing more.
check("rice picks higher-quality supplier by default", () => {
  const q = buildQuote([{ name: "rice", qty: 2 }]);
  assert.equal(q.lines.length, 1);
  assert.equal(q.lines[0].supplierId, "sup_melcom");
  assert.equal(q.lines[0].lineTotal, 49000 * 2);
});
check("bad ratings flip the pick to the cheaper rival", () => {
  for (let i = 0; i < 5; i++) addRating("sup_melcom", 1);
  const q = buildQuote([{ name: "rice", qty: 2 }]);
  assert.equal(q.lines[0].supplierId, "sup_ghanafoods");
});
check("unapproved supplier never wins", () => {
  const q = buildQuote([{ name: "rice", qty: 1 }]);
  for (const l of q.lines) assert.notEqual(l.supplierId, "sup_unapproved");
});
check("over-requested stock partially fills and offers the rest", () => {
  const q = buildQuote([{ name: "sugar", qty: 100 }]);
  assert.equal(q.lines.length, 1);
  assert.equal(q.lines[0].partial, true);
  assert.equal(q.unavailable.length, 1);
  assert.ok(q.unavailable[0].reason.includes("partial"));
});
check("unknown product is logged, not crashed on", () => {
  const q = buildQuote([{ name: "unicorn horns", qty: 1 }]);
  assert.equal(q.lines.length, 0);
  assert.equal(q.unavailable[0].reason, "no approved supplier");
});

// Pricing: one total, fee per drop.
check("single drop fee is one base", () => {
  const q = priceQuote(buildQuote([{ name: "rice", qty: 1 }]));
  assert.equal(q.deliveryFee, 5000);
  assert.equal(q.total, q.subtotal + 5000);
});
check("two drops pay two base fees", () => {
  const q = priceQuote(buildQuote([{ name: "rice", qty: 1 }]), { drops: 2 });
  assert.equal(q.deliveryFee, 10000);
});
check("empty quote costs nothing", () => {
  const q = priceQuote(buildQuote([{ name: "unicorn horns", qty: 1 }]));
  assert.equal(q.subtotal, 0);
  assert.equal(q.deliveryFee, 0);
  assert.equal(q.total, 0);
});

// Preferences: opt-in supplier wins when in stock.
check("preferred supplier wins when in stock", () => {
  const q = buildQuote([{ name: "rice", qty: 1 }], { preferredSupplierFor: () => "sup_melcom" });
  assert.equal(q.lines[0].supplierId, "sup_melcom");
});

console.log(`\n${passed} checks passed`);
