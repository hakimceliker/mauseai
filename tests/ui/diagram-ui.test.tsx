import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DiagramPage, { viewport } from "@/app/diagram/page";
import DiagramExplorer from "@/app/diagram/diagram-explorer";
import { DIAGRAM_EDGES, DIAGRAM_LANES, DIAGRAM_NODES } from "@/src/lib/diagram/inventory";
import { COVERAGE } from "@/src/lib/diagram/coverage";

/**
 * /diagram on phones and tablets: server-rendered markup (what a screen reader
 * and a narrow viewport get first) and the responsive CSS contract.
 */

const css = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");

/** Body of the first @media block whose query contains `query`. */
function mediaBlock(query: string): string {
  const start = css.indexOf(`@media ${query}`);
  expect(start, `@media ${query} missing`).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) return css.slice(start, i + 1);
  }
  throw new Error("unbalanced css");
}

describe("/diagram page markup", () => {
  const html = renderToStaticMarkup(<DiagramPage />);

  it("sets a device-width viewport without disabling zoom", () => {
    expect(viewport).toEqual({ width: "device-width", initialScale: 1 });
    expect(JSON.stringify(viewport)).not.toMatch(/userScalable|maximumScale/);
  });

  it("offers a skip link to the text explorer and a Turkish lang", () => {
    expect(html).toContain('class="skip-link" href="#diagram-explorer-heading"');
    expect(html).toContain('id="diagram-explorer-heading"');
    expect(html).toContain('lang="tr"');
  });

  it("keeps the original SVG as an image with a descriptive alt and a scrollable, focusable region", () => {
    expect(html).toMatch(/<div class="diagram-scroll" tabindex="0" role="region" aria-label="[^"]+"/);
    expect(html).toMatch(/<img [^>]*alt="[^"]*şerit[^"]*kart[^"]*bağlantı/);
    expect(html).toContain("scroll-hint");
  });
});

describe("DiagramExplorer markup", () => {
  const html = renderToStaticMarkup(<DiagramExplorer lanes={[...DIAGRAM_LANES]} nodes={DIAGRAM_NODES} edges={DIAGRAM_EDGES} coverage={COVERAGE} />);

  it("renders one toggle button per card, grouped by lane", () => {
    expect((html.match(/aria-pressed=/g) ?? []).length).toBe(DIAGRAM_NODES.length);
    expect((html.match(/role="group"/g) ?? []).length).toBe(DIAGRAM_LANES.length);
    expect((html.match(/aria-pressed="true"/g) ?? []).length).toBe(1);
    expect(html).toContain('aria-controls="node-detail"');
  });

  it("labels the detail panel and makes it focusable for reveal-on-tap", () => {
    expect(html).toMatch(/<article id="node-detail"[^>]*aria-live="polite"[^>]*aria-labelledby="node-detail-title"[^>]*tabindex="-1"/);
    expect(html).toContain('id="node-detail-title"');
  });

  it("uses stackable tables with data-label cells inside labelled scroll regions", () => {
    expect((html.match(/class="stack-table"/g) ?? []).length).toBe(2);
    expect(html).toMatch(/class="table-scroll" tabindex="0" role="region" aria-label="[^"]+yetenek tablosu"/);
    expect(html).toContain('aria-label="Bağlantı tablosu"');
    for (const label of ["Durum", "Kod", "Tür", "Anlam"]) expect(html).toContain(`data-label="${label}"`);
    expect((html.match(/<tr>/g) ?? []).length).toBeGreaterThan(DIAGRAM_EDGES.length);
  });
});

describe("responsive and accessibility CSS", () => {
  it("defines tablet and phone breakpoints", () => {
    const tablet = mediaBlock("(min-width: 600px) and (max-width: 859px)");
    expect(tablet).toMatch(/grid-template-columns:\s*repeat\(2/);
    const phone = mediaBlock("(max-width: 599px)");
    expect(phone).toContain(".stack-table");
    expect(phone).toMatch(/content:\s*attr\(data-label\)/);
    expect(phone).toContain(".scroll-hint");
  });

  it("keeps touch targets at least 44px", () => {
    expect(css).toMatch(/min-height:\s*44px/);
  });

  it("honours reduced motion and forced colours, and shows focus", () => {
    expect(mediaBlock("(prefers-reduced-motion: reduce)")).toMatch(/scroll-behavior:\s*auto|transition/);
    expect(mediaBlock("(forced-colors: active)")).toBeTruthy();
    expect(css).toMatch(/\.skip-link:focus/);
    expect(css).toMatch(/:focus-visible/);
  });
});
