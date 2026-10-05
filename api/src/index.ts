import express from "express";
import { prisma } from "./db.js";
import { healthRouter } from "./modules/health.js";
import { identityRouter } from "./modules/identity.js";
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

// Refuse to boot without the database file. First run:
//   npx prisma migrate dev   (reads DATABASE_URL from api/.env)
try {
  await prisma.$queryRaw`SELECT 1`;
} catch {
  console.error("Database not reachable. Run: npx prisma migrate dev (DATABASE_URL in api/.env)");
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: "1mb" }));

app.use("/v1/health", healthRouter);
app.use("/v1/identity", identityRouter);
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
app.listen(port, () => console.log(`Bright API listening on :${port}`));
