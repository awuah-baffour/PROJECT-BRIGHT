import { Router } from "express";

// Phase 0 stub: phone OTP + RBAC skeleton (AD-10)
// Owner > Manager > Staff. Enforce create/approve/pay + spending caps in Phase 1.
export const identityRouter = Router();

const roles = ["owner", "manager", "staff"] as const;

identityRouter.get("/roles", (_req, res) => {
  res.json({ roles });
});

identityRouter.post("/otp/request", (req, res) => {
  const { phone } = req.body ?? {};
  if (!phone) return res.status(400).json({ error: "phone required" });
  // TODO Phase 1: integrate SMS gateway, store hashed code with expiry
  res.json({ ok: true, message: `OTP requested for ${phone} (stub)` });
});

identityRouter.post("/otp/verify", (req, res) => {
  const { phone, code } = req.body ?? {};
  if (!phone || !code) return res.status(400).json({ error: "phone and code required" });
  // TODO Phase 1: verify code, issue session + PIN setup
  res.json({ ok: true, retailerId: "ret_stub", role: "owner" });
});
