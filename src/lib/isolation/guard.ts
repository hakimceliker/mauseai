import { createRateLimiter } from "@/src/lib/ratelimit/distributed";

/**
 * Isolation gate (diagram card I): tenant boundary, RBAC, rate limits and
 * budget control, evaluated with safe defaults — anything not explicitly
 * allowed is denied.
 */

export type Role = "owner" | "admin" | "member" | "viewer";

export type Permission =
  | "core.ask"
  | "knowledge.read"
  | "knowledge.write"
  | "ingest.write"
  | "blueprint.read"
  | "blueprint.write"
  | "feedback.write"
  | "feedback.read"
  | "flow.run"
  | "flow.manage"
  | "approval.decide"
  | "notification.read"
  | "rollout.manage"
  | "eval.run"
  | "risk.scan"
  | "ops.read"
  | "ownership.manage"
  | "compliance.request"
  | "compliance.decide"
  | "tool.invoke.read"
  | "tool.invoke.write"
  | "notification.manage"
  | "crm.sync"
  | "config.read";

const MEMBER: Permission[] = [
  "core.ask",
  "knowledge.read",
  "blueprint.read",
  "feedback.write",
  "flow.run",
  "notification.read",
  "compliance.request",
  "tool.invoke.read",
];
const VIEWER: Permission[] = ["knowledge.read", "blueprint.read", "notification.read", "feedback.write"];
const ADMIN: Permission[] = [
  ...MEMBER,
  "knowledge.write",
  "ingest.write",
  "blueprint.write",
  "feedback.read",
  "flow.manage",
  "approval.decide",
  "rollout.manage",
  "eval.run",
  "risk.scan",
  "ops.read",
  "tool.invoke.write",
  "notification.manage",
  "crm.sync",
  "config.read",
];
const OWNER: Permission[] = [...ADMIN, "ownership.manage", "compliance.decide"];

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  owner: new Set(OWNER),
  admin: new Set(ADMIN),
  member: new Set(MEMBER),
  viewer: new Set(VIEWER),
};

export function isRole(value: unknown): value is Role {
  return value === "owner" || value === "admin" || value === "member" || value === "viewer";
}

export function can(role: unknown, permission: Permission): boolean {
  if (!isRole(role)) return false;
  return ROLE_PERMISSIONS[role].has(permission);
}

export interface GuardContext {
  tenantId: string;
  userId: string;
  role: unknown;
}

export interface GuardRequest {
  permission: Permission;
  resourceTenantId?: string;
  estimatedCostCents?: number;
  budget?: { spentCents: number; limitCents: number | null };
}

export type GuardDecision =
  | { allowed: true }
  | { allowed: false; reason: "tenant_mismatch" | "forbidden" | "rate_limited" | "budget_exceeded" | "invalid_context"; status: 400 | 403 | 429 | 402 };

/** Sync (tests, in-memory) or async (distributed store) limiter. */
export interface RateLimiter {
  isAllowed(key: string, limit: number): boolean | Promise<boolean>;
}

export const TENANT_REQUESTS_PER_MINUTE = 600;

let defaultLimiter: RateLimiter | null = null;
function getDefaultLimiter(): RateLimiter {
  if (!defaultLimiter) defaultLimiter = createRateLimiter();
  return defaultLimiter;
}

export async function evaluateGuard(
  ctx: GuardContext,
  request: GuardRequest,
  limiter: RateLimiter = getDefaultLimiter(),
): Promise<GuardDecision> {
  if (!ctx.tenantId || !ctx.userId) return { allowed: false, reason: "invalid_context", status: 400 };
  if (request.resourceTenantId && request.resourceTenantId !== ctx.tenantId)
    return { allowed: false, reason: "tenant_mismatch", status: 403 };
  if (!can(ctx.role, request.permission)) return { allowed: false, reason: "forbidden", status: 403 };
  if (request.budget && request.budget.limitCents !== null) {
    const next = request.budget.spentCents + (request.estimatedCostCents ?? 0);
    if (next > request.budget.limitCents) return { allowed: false, reason: "budget_exceeded", status: 402 };
  }
  if (!(await limiter.isAllowed(`tenant:${ctx.tenantId}`, TENANT_REQUESTS_PER_MINUTE)))
    return { allowed: false, reason: "rate_limited", status: 429 };
  return { allowed: true };
}
