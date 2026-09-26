/**
 * Parser for the official A–Z system diagram (public/diagrams/masuai-a-z-diyagram.svg).
 *
 * The SVG is the source of truth: this parser reads lanes, cards, labels and
 * connectors straight from the markup and resolves every connector to the
 * cards it touches using geometry, so the inventory in ./inventory.ts can be
 * verified against the real file instead of being maintained by hand only.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ParsedLane extends Rect {
  id: string;
  title: string;
}

export interface ParsedCard extends Rect {
  id: string;
  title: string;
  lines: string[];
  laneId: string | null;
}

export interface ParsedEdge {
  from: string;
  to: string;
  style: "solid" | "dashed";
}

export interface ParsedDiagram {
  width: number;
  height: number;
  title: string;
  subtitle: string;
  principle: string;
  lanes: ParsedLane[];
  cards: ParsedCard[];
  edges: ParsedEdge[];
}

type Element = { tag: string; attrs: Record<string, string>; text: string };

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

function decode(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|#39|apos);/g, (m) => ENTITIES[m] ?? m);
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of raw.matchAll(/([a-zA-Z_:-]+)="([^"]*)"/g)) {
    attrs[match[1]] = decode(match[2]);
  }
  return attrs;
}

/** Linear scan of the drawable elements in document order (defs are skipped). */
function scanElements(svg: string): Element[] {
  const body = svg.replace(/<defs>[\s\S]*?<\/defs>/, "").replace(/<!--[\s\S]*?-->/g, "");
  const elements: Element[] = [];
  const pattern = /<(rect|text|path)\b([^>]*?)(\/>|>([\s\S]*?)<\/\1>)/g;
  for (const match of body.matchAll(pattern)) {
    elements.push({
      tag: match[1],
      attrs: parseAttrs(match[2]),
      text: decode((match[4] ?? "").replace(/<[^>]+>/g, "")).trim(),
    });
  }
  return elements;
}

function num(attrs: Record<string, string>, key: string): number {
  const value = Number(attrs[key]);
  if (!Number.isFinite(value)) throw new Error(`svg_attr_invalid:${key}`);
  return value;
}

function contains(rect: Rect, x: number, y: number, tolerance = 1): boolean {
  return (
    x >= rect.x - tolerance &&
    x <= rect.x + rect.width + tolerance &&
    y >= rect.y - tolerance &&
    y <= rect.y + rect.height + tolerance
  );
}

/** "A — Amaç & Konumlandırma" → "A", "V–Z — …" → "V-Z", "MASUAI CORE" → "CORE". */
export function cardIdFromTitle(title: string): string {
  if (/\bCORE\b/.test(title)) return "CORE";
  const match = title.match(/^([A-Z](?:[–-][A-Z])?)\s+—/);
  if (!match) throw new Error(`svg_card_title_unrecognised:${title}`);
  return match[1].replace("–", "-");
}

/** Splits a path "d" made of absolute M/H/V commands into [start, end] points per subpath. */
export function subpathEndpoints(d: string): Array<{ start: [number, number]; end: [number, number] }> {
  const tokens = d.match(/[MHVL]|-?\d+(?:\.\d+)?/g) ?? [];
  const result: Array<{ start: [number, number]; end: [number, number] }> = [];
  let current: { start: [number, number]; end: [number, number] } | null = null;
  let i = 0;
  while (i < tokens.length) {
    const command = tokens[i++];
    if (command === "M" || command === "L") {
      const point: [number, number] = [Number(tokens[i++]), Number(tokens[i++])];
      if (command === "M") {
        if (current) result.push(current);
        current = { start: point, end: point };
      } else if (current) {
        current.end = point;
      }
    } else if (command === "H" && current) {
      current.end = [Number(tokens[i++]), current.end[1]];
    } else if (command === "V" && current) {
      current.end = [current.end[0], Number(tokens[i++])];
    } else {
      throw new Error(`svg_path_unsupported:${command}`);
    }
  }
  if (current) result.push(current);
  return result;
}

export function parseDiagramSvg(svg: string): ParsedDiagram {
  const root = svg.match(/<svg\b([^>]*)>/);
  if (!root) throw new Error("svg_root_missing");
  const rootAttrs = parseAttrs(root[1]);
  const elements = scanElements(svg);

  const lanes: ParsedLane[] = [];
  const cards: ParsedCard[] = [];
  const texts: Array<{ className: string; text: string; x: number; y: number }> = [];
  let currentCard: ParsedCard | null = null;
  const paths: Array<{ d: string; className: string }> = [];

  for (const el of elements) {
    if (el.tag === "rect") {
      const rect = {
        x: Number(el.attrs.x ?? 0),
        y: Number(el.attrs.y ?? 0),
        width: num(el.attrs, "width"),
        height: num(el.attrs, "height"),
      };
      currentCard = null;
      if (el.attrs.stroke) {
        lanes.push({ ...rect, id: "", title: "" });
      } else if (el.attrs.rx) {
        currentCard = { ...rect, id: "", title: "", lines: [], laneId: null };
        cards.push(currentCard);
      }
      continue;
    }
    if (el.tag === "path") {
      paths.push({ d: el.attrs.d ?? "", className: el.attrs.class ?? "" });
      continue;
    }
    const className = el.attrs.class ?? "";
    const x = Number(el.attrs.x);
    const y = Number(el.attrs.y);
    if (currentCard && contains(currentCard, x, y)) {
      if (!currentCard.title) {
        currentCard.title = el.text;
        currentCard.id = cardIdFromTitle(el.text);
      } else {
        currentCard.lines.push(el.text);
      }
    } else {
      texts.push({ className, text: el.text, x, y });
    }
  }

  const sections = texts.filter((t) => t.className === "section");
  for (const lane of lanes) {
    const heading = sections.find((s) => contains(lane, s.x, s.y));
    if (!heading) throw new Error("svg_lane_heading_missing");
    lane.title = heading.text;
    lane.id = `lane-${heading.text.split("·")[0].trim()}`;
  }
  for (const card of cards) {
    if (!card.id) throw new Error("svg_card_without_title");
    const cx = card.x + card.width / 2;
    const cy = card.y + card.height / 2;
    card.laneId = lanes.find((lane) => contains(lane, cx, cy, 0))?.id ?? null;
  }

  const findCard = (x: number, y: number) => cards.find((card) => contains(card, x, y));
  const edges: ParsedEdge[] = [];
  for (const path of paths) {
    const style = path.className.split(/\s+/).includes("dash") ? "dashed" : "solid";
    for (const { start, end } of subpathEndpoints(path.d)) {
      const from = findCard(...start);
      const to = findCard(...end);
      if (!from || !to) throw new Error(`svg_edge_unresolved:${start.join(",")}->${end.join(",")}`);
      edges.push({ from: from.id, to: to.id, style });
    }
  }

  const title = texts.find((t) => t.className === "title")?.text ?? "";
  const subtitle = texts.find((t) => t.className === "sub")?.text ?? "";
  const principle = texts.find((t) => t.text.startsWith("Akış prensibi"))?.text ?? "";

  return {
    width: Number(rootAttrs.width),
    height: Number(rootAttrs.height),
    title,
    subtitle,
    principle,
    lanes,
    cards,
    edges,
  };
}
