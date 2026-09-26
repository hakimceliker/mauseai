import { NextResponse } from "next/server";
import type { z } from "zod";
import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import { getTenantContext } from "@/src/server/auth/tenant-context";
import { evaluateGuard, type Permission, type Role } from "@/src/lib/isolation/guard";

/**
 * Shared request pipeline for the A–Z routes, mirroring the served task routes:
 * user session → tenant context (profiles) → isolation gate (RBAC + rate) →
 * validated body → handler. Errors never leak internals.
 */

export type DbClient = Awaited<ReturnType<typeof getSupabaseServerClient>>;

export interface TenantRequestContext {
  client: DbClient;
  tenantId: string;
  userId: string;
  role: Role;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(code);
  }
}

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export async function parseBody<S extends z.ZodTypeAny>(request: Request, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError(400, "invalid_json");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, "invalid_request", parsed.error.flatten());
  return parsed.data;
}

/** Throws a 500-class error with a stable code when a Supabase call fails. */
export function must<T>(result: { data: T | null; error: { message: string; code?: string } | null }, code: string): T {
  if (result.error) {
    if (result.error.code === "23505") throw new HttpError(409, `${code}_conflict`);
    throw new HttpError(500, code);
  }
  if (result.data === null) throw new HttpError(404, `${code}_not_found`);
  return result.data;
}

export async function withTenant(
  permission: Permission,
  handler: (ctx: TenantRequestContext) => Promise<Response>,
): Promise<Response> {
  try {
    const client = await getSupabaseServerClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    const tenant = await getTenantContext(client, user.id);
    if (!tenant) return json({ error: "tenant_context_required" }, 403);
    const decision = evaluateGuard({ tenantId: tenant.tenantId, userId: user.id, role: tenant.role }, { permission });
    if (!decision.allowed) return json({ error: decision.reason }, decision.status);
    return await handler({ client, tenantId: tenant.tenantId, userId: user.id, role: tenant.role as Role });
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.code, ...(error.details ? { details: error.details } : {}) }, error.status);
    return json({ error: "internal_error" }, 500);
  }
}
