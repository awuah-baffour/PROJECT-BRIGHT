import express from "express";
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

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Bright API Phase 2 listening on :${port}`));
