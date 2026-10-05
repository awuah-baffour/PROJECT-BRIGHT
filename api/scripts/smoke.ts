// Smoke test for the database step. Run twice: first run seeds a probe row,
// second run finds it, proving data survives across processes (restarts).
import { prisma } from "../src/db.js";

const ID = "smoke_probe";

const existing = await prisma.orderDoc.findUnique({ where: { id: ID } });
if (existing) {
  console.log(`PERSISTED: probe from earlier run found (status=${existing.status}, total=${existing.total})`);
} else {
  await prisma.orderDoc.create({
    data: { id: ID, status: "quoted", total: 100, data: JSON.stringify({ note: "persistence probe" }) },
  });
  console.log("SEEDED: probe written - run again to verify it persisted");
}
await prisma.$disconnect();
