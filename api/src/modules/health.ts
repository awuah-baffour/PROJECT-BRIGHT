import { Router } from "express";
export const healthRouter = Router();
healthRouter.get("/", (_req, res) => {
  res.json({ ok: true, service: "project-bright-api", phase: "0-foundation" });
});
