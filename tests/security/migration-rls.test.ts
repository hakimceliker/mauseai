import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationDir = join(process.cwd(), 'supabase', 'migrations');
const migrations = readdirSync(migrationDir).filter((file) => /^\d{4}_.*\.sql$/.test(file)).sort();
const sql = migrations.map((file) => readFileSync(join(migrationDir, file), 'utf8')).join('\n');

describe('Supabase migration security gates', () => {
  it('has an explicit, documented migration sequence', () => {
    expect(migrations.length).toBeGreaterThan(0);
    expect(migrations[0]).toMatch(/^0001_/);
    expect(migrations).not.toContain(expect.stringMatching(/^0007_/));
  });

  it('enables RLS and defines a policy for every application table', () => {
    const tables = [...sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+(?:public\.)?([a-z_][a-z0-9_]*)\s*\(/gi)].map((match) => match[1].toLowerCase());
    const uniqueTables = [...new Set(tables)];
    const rlsTables = new Set([...sql.matchAll(/ALTER TABLE\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+ENABLE ROW LEVEL SECURITY/gi)].map((match) => match[1].toLowerCase()));
    const policyTables = new Set([...sql.matchAll(/CREATE POLICY\s+[a-z_][a-z0-9_]*\s+ON\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi)].map((match) => match[1].toLowerCase()));
    expect(uniqueTables).not.toHaveLength(0);
    for (const table of uniqueTables) {
      expect(rlsTables, `RLS missing for ${table}`).toContain(table);
      expect(policyTables, `policy missing for ${table}`).toContain(table);
    }
  });

  it('does not contain production credentials or executable local secrets', () => {
    expect(sql).not.toMatch(/sk_(?:live|test)_[A-Za-z0-9]/i);
    expect(sql).not.toMatch(/service_role\s*[:=]\s*['"][^'"]+['"]/i);
  });

  it('defines the cost ledger required by the server cost service', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.cost_events/i);
    expect(sql).toMatch(/cost_events_task_trace_unique/i);
    expect(sql).toMatch(/ALTER TABLE public\.cost_events ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/CREATE POLICY cost_events_tenant_write ON public\.cost_events/i);
  });
});
