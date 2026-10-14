import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "./db.js";
import { healthRouter } from "./modules/health.js";
import { bootstrapAdminFromEnvironment, identityRouter } from "./modules/identity.js";
import { catalogRouter } from "./modules/catalog.js";
import { ordersRouter } from "./modules/orders.js";
import { paymentsRouter } from "./modules/payments.js";
import { logisticsRouter } from "./modules/logistics.js";
import { supportRouter } from "./modules/support.js";
import { ratingsRouter } from "./modules/ratings.js";
import { recurringRouter } from "./modules/recurring.js";
import { opsRouter } from "./modules/ops.js";
import { outboundRouter } from "./modules/outbound.js";
import { insightsRouter } from "./modules/insights.js";
import { trackingRouter } from "./modules/tracking.js";
import { adminRouter } from "./modules/admin.js";
import { suppliersRouter } from "./modules/suppliers.js";
import { integrationsRouter } from "./modules/integrations.js";

await bootstrapAdminFromEnvironment();

export const app = express();
app.use(express.json({ limit: "1mb" }));

// Shopkeeper app (static PWA, same origin so no CORS needed).
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const webDirectory = [
  path.join(moduleDirectory, "web"),
  path.resolve(moduleDirectory, "../web"),
  path.join(process.cwd(), "web"),
  path.join(process.cwd(), "api", "web"),
].find(existsSync);
if (!webDirectory) {
  throw new Error("Frontend assets not found. Ensure api/web is included in the deployment.");
}
app.get("/", (_req, res, next) => {
  res.sendFile(path.join(webDirectory, "index.html"), (error) => {
    if (error) next(error);
  });
});
app.use(express.static(webDirectory));

app.use("/v1/health", healthRouter);
app.use("/v1/identity", identityRouter);
app.use("/v1/admin", adminRouter);
app.use("/v1/suppliers", suppliersRouter);
app.use("/v1/integrations", integrationsRouter);
app.use("/v1/catalog", catalogRouter);
app.use("/v1/orders", ordersRouter);
app.use("/v1/payments", paymentsRouter);
app.use("/v1/logistics", logisticsRouter);
app.use("/v1/support", supportRouter);
app.use("/v1/ratings", ratingsRouter);
app.use("/v1/recurring", recurringRouter);
app.use("/v1/ops", opsRouter);
app.use("/v1/outbound", outboundRouter);
app.use("/v1/insights", insightsRouter);
app.use("/v1/tracking", trackingRouter);

// Async route errors land here instead of hanging the request.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "internal error" });
});

const port = Number(process.env.PORT ?? 3000);
if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`Bright API listening on :${port}`));
}

export default app;
