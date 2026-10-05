import { prisma } from "../db.js";

export interface Issue {
  id: string;
  orderId: string;
  type: string;
  detail: string | null;
  status: "open" | "resolved" | "refunded" | "replaced";
  resolution: string | null;
  createdAt: string;
}

function toIssue(row: {
  id: string;
  orderId: string;
  type: string;
  detail: string | null;
  status: string;
  resolution: string | null;
  createdAt: Date;
}): Issue {
  return {
    id: row.id,
    orderId: row.orderId,
    type: row.type,
    detail: row.detail,
    status: row.status as Issue["status"],
    resolution: row.resolution,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function saveIssue(i: Issue): Promise<void> {
  await prisma.issue.upsert({
    where: { id: i.id },
    create: { id: i.id, orderId: i.orderId, type: i.type, detail: i.detail, status: i.status, resolution: i.resolution },
    update: { status: i.status, resolution: i.resolution },
  });
}

export async function getIssue(id: string): Promise<Issue | undefined> {
  const row = await prisma.issue.findUnique({ where: { id } });
  return row ? toIssue(row) : undefined;
}

export async function issuesForOrder(orderId: string): Promise<Issue[]> {
  const rows = await prisma.issue.findMany({ where: { orderId }, orderBy: { createdAt: "asc" } });
  return rows.map(toIssue);
}

export function newIssueId(): string {
  return `iss_${Math.random().toString(36).slice(2, 9)}`;
}
