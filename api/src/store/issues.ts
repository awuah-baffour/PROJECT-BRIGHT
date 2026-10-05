export interface Issue {
  id: string;
  orderId: string;
  type: string;
  detail: string | null;
  status: "open" | "resolved" | "refunded" | "replaced";
  resolution: string | null;
  createdAt: string;
}

const issues = new Map<string, Issue>();

export function saveIssue(i: Issue): void {
  issues.set(i.id, i);
}
export function getIssue(id: string): Issue | undefined {
  return issues.get(id);
}
export function issuesForOrder(orderId: string): Issue[] {
  return [...issues.values()].filter((i) => i.orderId === orderId);
}
