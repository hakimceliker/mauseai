import type { PGlite } from "@electric-sql/pglite";

/**
 * Minimal supabase-js compatible query builder over PGlite, so services run
 * their real queries against the real migrated schema. With `claims`, every
 * query runs as the `authenticated` role with that JWT (RLS enforced); without
 * claims it acts like the service-role client (RLS bypassed).
 */

type Result = { data: unknown; error: { message: string; code?: string } | null };
type Filter = { sql: string; values: unknown[] };

const ident = (name: string) => {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`unsafe identifier: ${name}`);
  return `"${name}"`;
};

class Query implements PromiseLike<Result> {
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private columns = "*";
  private returning: string | null = null;
  private payload: Record<string, unknown>[] = [];
  private onConflict: string | undefined;
  private ignoreDuplicates = false;
  private filters: Filter[] = [];
  private orders: string[] = [];
  private limitN: number | null = null;
  private mode: "many" | "single" | "maybeSingle" = "many";

  constructor(
    private readonly client: PgClient,
    private readonly table: string,
  ) {}

  select(columns = "*") {
    if (this.op === "select") this.columns = columns;
    else this.returning = columns;
    return this;
  }
  insert(values: Record<string, unknown> | Record<string, unknown>[]) {
    this.op = "insert";
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }
  upsert(values: Record<string, unknown> | Record<string, unknown>[], options: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.op = "upsert";
    this.payload = Array.isArray(values) ? values : [values];
    this.onConflict = options.onConflict;
    this.ignoreDuplicates = options.ignoreDuplicates ?? false;
    return this;
  }
  update(values: Record<string, unknown>) {
    this.op = "update";
    this.payload = [values];
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  private where(column: string, operator: string, value: unknown) {
    this.filters.push({ sql: `${ident(column)} ${operator} $`, values: [value] });
    return this;
  }
  eq(c: string, v: unknown) { return this.where(c, "=", v); }
  neq(c: string, v: unknown) { return this.where(c, "<>", v); }
  lt(c: string, v: unknown) { return this.where(c, "<", v); }
  lte(c: string, v: unknown) { return this.where(c, "<=", v); }
  gt(c: string, v: unknown) { return this.where(c, ">", v); }
  gte(c: string, v: unknown) { return this.where(c, ">=", v); }
  in(c: string, v: unknown[]) {
    this.filters.push({ sql: `${ident(c)} = ANY($)`, values: [v] });
    return this;
  }
  is(c: string, v: null | boolean) {
    this.filters.push({ sql: `${ident(c)} IS ${v === null ? "NULL" : v ? "TRUE" : "FALSE"}`, values: [] });
    return this;
  }
  order(c: string, options: { ascending?: boolean } = {}) {
    this.orders.push(`${ident(c)} ${options.ascending === false ? "DESC" : "ASC"}`);
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybeSingle";
    return this;
  }

  then<A = Result, B = never>(ok?: ((value: Result) => A | PromiseLike<A>) | null, fail?: ((reason: unknown) => B | PromiseLike<B>) | null) {
    return this.execute().then(ok, fail);
  }

  private cols(list: string) {
    return list.trim() === "*" ? "*" : list.split(",").map((c) => ident(c.trim())).join(", ");
  }

  private async execute(): Promise<Result> {
    const values: unknown[] = [];
    const bind = (v: unknown) => {
      values.push(v);
      return `$${values.length}`;
    };
    const where = () => {
      if (!this.filters.length) return "";
      return " WHERE " + this.filters.map((f) => f.sql.replace("$", () => (f.values.length ? bind(f.values[0]) : ""))).join(" AND ");
    };
    const types = await this.client.columnTypes(this.table);
    const encode = (col: string, v: unknown) => (v !== null && v !== undefined && (types[col] === "json" || types[col] === "jsonb") ? JSON.stringify(v) : v);
    const t = ident(this.table);
    let sql: string;
    if (this.op === "select") {
      sql = `SELECT ${this.cols(this.columns)} FROM ${t}${where()}`;
      if (this.orders.length) sql += ` ORDER BY ${this.orders.join(", ")}`;
      if (this.limitN !== null) sql += ` LIMIT ${Number(this.limitN)}`;
    } else if (this.op === "insert" || this.op === "upsert") {
      const keys = [...new Set(this.payload.flatMap((r) => Object.keys(r)))];
      const rows = this.payload.map((r) => `(${keys.map((k) => (k in r ? bind(encode(k, r[k])) : "DEFAULT")).join(", ")})`);
      sql = `INSERT INTO ${t} (${keys.map(ident).join(", ")}) VALUES ${rows.join(", ")}`;
      if (this.op === "upsert") {
        const target = (this.onConflict ?? "id").split(",").map((c) => ident(c.trim()));
        const updates = keys.filter((k) => !target.includes(ident(k))).map((k) => `${ident(k)} = EXCLUDED.${ident(k)}`);
        sql += ` ON CONFLICT (${target.join(", ")}) ${updates.length && !this.ignoreDuplicates ? `DO UPDATE SET ${updates.join(", ")}` : "DO NOTHING"}`;
      }
      sql += ` RETURNING ${this.returning ? this.cols(this.returning) : "*"}`;
    } else if (this.op === "update") {
      const sets = Object.entries(this.payload[0]).map(([k, v]) => `${ident(k)} = ${bind(encode(k, v))}`);
      sql = `UPDATE ${t} SET ${sets.join(", ")}${where()} RETURNING ${this.returning ? this.cols(this.returning) : "*"}`;
    } else {
      sql = `DELETE FROM ${t}${where()} RETURNING *`;
    }

    try {
      const rows = (await this.client.run(sql, values)) as Record<string, unknown>[];
      const writeWithoutSelect = this.op !== "select" && this.returning === null && this.mode === "many";
      if (writeWithoutSelect) return { data: null, error: null };
      if (this.mode === "single") {
        if (rows.length !== 1) return { data: null, error: { message: `expected 1 row, got ${rows.length}`, code: "PGRST116" } };
        return { data: rows[0], error: null };
      }
      if (this.mode === "maybeSingle") {
        if (rows.length > 1) return { data: null, error: { message: "multiple rows", code: "PGRST116" } };
        return { data: rows[0] ?? null, error: null };
      }
      return { data: rows, error: null };
    } catch (error) {
      const e = error as { message: string; code?: string };
      return { data: null, error: { message: e.message, code: e.code } };
    }
  }
}

export class PgClient {
  private static typeCache = new WeakMap<PGlite, Map<string, Record<string, string>>>();

  constructor(
    readonly db: PGlite,
    readonly claims: { sub: string; tenant_id?: string } | null = null,
  ) {}

  from(table: string) {
    return new Query(this, table);
  }

  async columnTypes(table: string): Promise<Record<string, string>> {
    let cache = PgClient.typeCache.get(this.db);
    if (!cache) PgClient.typeCache.set(this.db, (cache = new Map()));
    const hit = cache.get(table);
    if (hit) return hit;
    const res = await this.db.query<{ column_name: string; data_type: string }>(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
      [table],
    );
    const map = Object.fromEntries(res.rows.map((r) => [r.column_name, r.data_type]));
    cache.set(table, map);
    return map;
  }

  /** Runs one statement, as the authenticated role when claims are set. Serialised per database. */
  async run(sql: string, values: unknown[]) {
    return this.db.transaction(async (tx) => {
      if (this.claims) {
        await tx.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify(this.claims)]);
        await tx.exec("SET LOCAL ROLE authenticated");
      }
      const res = await tx.query(sql, values);
      return res.rows;
    });
  }
}

export const asClient = (db: PGlite, claims?: { sub: string; tenant_id?: string }) => new PgClient(db, claims ?? null);
