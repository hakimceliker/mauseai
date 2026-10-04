---
name: supabase-migration-rls
description: Use when adding or changing a Supabase table/migration under supabase/migrations — ensures RLS policies and multi-tenant isolation are correct and tested.
---

# Supabase Migration + RLS Policy

This project is multi-tenant and relies on Postgres RLS for isolation (see `tests/security/rls-negative.test.ts`, `src/server/auth/tenant-context.ts`). Every new table needs RLS from the start — there is no "add RLS later" step.

## Steps

1. Read the existing migrations in `supabase/migrations/` to match naming (`<timestamp>_<description>.sql`) and structure.
2. Write the new migration: table/column changes AND the RLS policy in the same migration — never ship a table without RLS enabled, even temporarily.
3. Policy must scope every row to `tenant_id` (or the project's equivalent tenant key) matching the authenticated user's tenant — follow the current authoritative policies in `supabase/migrations/0012_authoritative_tenant_rls.sql`.
4. Add a negative test to `tests/security/rls-negative.test.ts` style: confirm a user from tenant A cannot read/write tenant B's rows through the new table.
5. Run `supabase db lint` (or the project's equivalent check) before considering the migration done.
6. Never disable RLS "temporarily for testing" in a committed migration — use a separate local-only override if needed.
