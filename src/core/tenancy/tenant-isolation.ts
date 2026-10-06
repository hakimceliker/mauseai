/**
 * Application-level tenant isolation guard.
 *
 * This is an in-process defence-in-depth layer. Production database RLS
 * remains a separate acceptance gate and must be verified against Supabase.
 */
export interface TenantScopedRecord {
  tenantId: string;
}

export class TenantAccessDeniedError extends Error {
  constructor(expectedTenant: string, actualTenant: string) {
    super(`Tenant access denied: ${actualTenant} cannot access ${expectedTenant}`);
    this.name = "TenantAccessDeniedError";
  }
}

export class TenantIsolationGuard<T extends TenantScopedRecord> {
  constructor(private readonly currentTenant: string) {
    if (!currentTenant) throw new Error("Tenant context is required");
  }

  canAccess(record: T): boolean {
    return record.tenantId === this.currentTenant;
  }

  assertAccess(record: T): void {
    if (!this.canAccess(record)) {
      throw new TenantAccessDeniedError(this.currentTenant, record.tenantId);
    }
  }

  filter(records: readonly T[]): T[] {
    return records.filter((record) => this.canAccess(record));
  }
}

