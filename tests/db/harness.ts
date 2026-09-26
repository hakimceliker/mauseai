import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Real Postgres (PGlite, in-process) with the repo's migrations applied.
 * Supabase's auth.jwt()/auth.uid() are emulated from the request.jwt.claims
 * setting, exactly how PostgREST passes the caller's JWT to the database.
 */
export async function createMigratedDb(): Promise<PGlite> {
  const db = new PGlite({ extensions: { uuid_ossp, pgcrypto } });
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
      $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(auth.jwt() ->> 'sub', '')::uuid $$;
    CREATE ROLE authenticated NOLOGIN;
    GRANT USAGE ON SCHEMA auth TO authenticated;
  `);
  const dir = path.resolve(__dirname, "../../supabase/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      await db.exec(readFileSync(path.join(dir, file), "utf8"));
    } catch (error) {
      throw new Error(`migration ${file} failed: ${(error as Error).message}`);
    }
  }
  await db.exec(`
    GRANT USAGE ON SCHEMA public TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  `);
  return db;
}

/** Runs fn as the "authenticated" role with the given JWT claims, like a Supabase user request. */
export async function asUser<T>(db: PGlite, claims: { sub: string; tenant_id?: string }, fn: (tx: PGlite) => Promise<T>): Promise<T> {
  await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claims', '${JSON.stringify(claims).replace(/'/g, "''")}', false);`);
  try {
    return await fn(db);
  } finally {
    await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claims', '', false);`);
  }
}
