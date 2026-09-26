import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDiagramSvg } from "@/src/lib/diagram/svg-parser";
import {
  DIAGRAM_EDGES,
  DIAGRAM_LANES,
  DIAGRAM_NODES,
  DIAGRAM_PRINCIPLE,
  DIAGRAM_SHA256,
  DIAGRAM_SVG_PATH,
  DIAGRAM_TITLE,
} from "@/src/lib/diagram/inventory";

/** Contract: the official SVG, untouched, is exactly what the inventory (and so the code) describes. */
const svg = readFileSync(DIAGRAM_SVG_PATH, "utf8");
const parsed = parseDiagramSvg(svg);
const norm = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

describe("official A–Z diagram ↔ inventory", () => {
  it("the SVG file is byte-identical to the uploaded original", () => {
    expect(createHash("sha256").update(readFileSync(DIAGRAM_SVG_PATH)).digest("hex")).toBe(DIAGRAM_SHA256);
  });

  it("title, principle and canvas", () => {
    expect(parsed.title).toBe(DIAGRAM_TITLE);
    expect(parsed.principle).toBe(DIAGRAM_PRINCIPLE);
    expect([parsed.width, parsed.height]).toEqual([2200, 1400]);
  });

  it("4 lanes with the same titles", () => {
    expect(parsed.lanes.map((l) => [l.id, l.title])).toEqual(DIAGRAM_LANES.map((l) => [l.id, l.title]));
  });

  it("23 cards (22 lettered + CORE) with matching titles and lanes", () => {
    expect(parsed.cards).toHaveLength(23);
    expect(DIAGRAM_NODES).toHaveLength(23);
    for (const node of DIAGRAM_NODES) {
      const card = parsed.cards.find((c) => c.id === node.id);
      expect(card, node.id).toBeTruthy();
      expect(card!.title).toBe(node.title);
      expect(card!.laneId).toBe(node.lane);
    }
  });

  it("every capability in the inventory is written on its card", () => {
    for (const node of DIAGRAM_NODES) {
      const text = norm(parsed.cards.find((c) => c.id === node.id)!.lines.join(" "));
      for (const cap of node.capabilities) expect(text, `${node.id}: ${cap}`).toContain(norm(cap.replace(/^[V-Z]: /, "")));
    }
  });

  it("21 connectors: 15 solid (sync) and 6 dashed (async), exactly as inventoried", () => {
    const fromSvg = parsed.edges.map((e) => `${e.from}->${e.to}:${e.style === "solid" ? "sync" : "async"}`).sort();
    const fromInventory = DIAGRAM_EDGES.map((e) => `${e.id}:${e.kind}`).sort();
    expect(fromSvg).toEqual(fromInventory);
    expect(DIAGRAM_EDGES.filter((e) => e.kind === "sync")).toHaveLength(15);
    expect(DIAGRAM_EDGES.filter((e) => e.kind === "async")).toHaveLength(6);
  });
});
