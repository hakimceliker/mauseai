import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DIAGRAM_EDGES, DIAGRAM_NODES } from "@/src/lib/diagram/inventory";
import { COVERAGE, coverageSummary, renderCoverageMarkdown } from "@/src/lib/diagram/coverage";

const MATRIX_DOC = "docs/diagrams/A-Z-COVERAGE.md";

describe("A–Z coverage matrix", () => {
  it("maps every card, every capability and every connector — nothing hidden", () => {
    expect(COVERAGE.nodes.map((n) => n.node)).toEqual(DIAGRAM_NODES.map((n) => n.id));
    for (const node of DIAGRAM_NODES) {
      const cov = COVERAGE.nodes.find((n) => n.node === node.id)!;
      expect(cov.capabilities.map((c) => c.capability), node.id).toEqual(node.capabilities);
    }
    expect(COVERAGE.edges.map((e) => e.id).sort()).toEqual(DIAGRAM_EDGES.map((e) => e.id).sort());
    expect(coverageSummary().unmapped).toEqual([]);
  });

  it("every referenced code path and test file exists", () => {
    const items = [...COVERAGE.nodes.flatMap((n) => n.capabilities), ...COVERAGE.edges];
    for (const item of items) {
      expect(item.code.length, item.id).toBeGreaterThan(0);
      expect(item.tests.length, item.id).toBeGreaterThan(0);
      for (const file of [...item.code, ...item.tests]) expect(existsSync(file), `${item.id} → ${file}`).toBe(true);
    }
  });

  it("anything not fully implemented carries a note explaining why", () => {
    const items = [...COVERAGE.nodes.flatMap((n) => n.capabilities), ...COVERAGE.edges];
    for (const item of items.filter((i) => i.status !== "implemented")) expect(item.note, item.id).toBeTruthy();
  });

  it(`${MATRIX_DOC} is generated from the matrix and up to date`, () => {
    const expected = renderCoverageMarkdown();
    if (process.env.UPDATE_DIAGRAM_MATRIX === "1") {
      mkdirSync(path.dirname(MATRIX_DOC), { recursive: true });
      writeFileSync(MATRIX_DOC, expected);
    }
    expect(existsSync(MATRIX_DOC), "run npm run diagram:matrix").toBe(true);
    expect(readFileSync(MATRIX_DOC, "utf8")).toBe(expected);
  });
});
