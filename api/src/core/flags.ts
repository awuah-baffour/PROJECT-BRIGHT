// AD-14 feature flags. Keep outbound pilot off until Phase 3.
export const flags = {
  quickCheckout: process.env.FEATURE_QUICK_CHECKOUT === "true",
  recurringOrders: process.env.FEATURE_RECURRING_ORDERS !== "false",
  outboundPilot: process.env.FEATURE_OUTBOUND_PILOT === "true",
};
