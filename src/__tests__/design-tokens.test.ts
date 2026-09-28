import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { colors, cssVariables } from '@/src/styles/tokens';

const globalsCss = readFileSync(
  path.resolve(__dirname, '../app/globals.css'),
  'utf8',
);

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function parseRootVariables(css: string): Map<string, string> {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const match = withoutComments.match(/:root\s*\{([\s\S]*?)\}/);
  if (!match) throw new Error(':root block not found in globals.css');
  const vars = new Map<string, string>();
  for (const decl of match[1].split(';')) {
    const idx = decl.indexOf(':');
    if (idx === -1) continue;
    const name = decl.slice(0, idx).trim();
    if (!name.startsWith('--mouse-')) continue;
    vars.set(name, normalize(decl.slice(idx + 1)));
  }
  return vars;
}

type Rgba = { r: number; g: number; b: number; a: number };

function parseColor(value: string): Rgba {
  const v = value.trim().toLowerCase();
  const hex = v.match(/^#([0-9a-f]{6})$/);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba = v.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
  if (rgba) {
    return {
      r: Number(rgba[1]),
      g: Number(rgba[2]),
      b: Number(rgba[3]),
      a: rgba[4] === undefined ? 1 : Number(rgba[4]),
    };
  }
  throw new Error(`Unsupported color: ${value}`);
}

/** Alpha-composite `top` over an opaque `bottom`. */
function composite(top: Rgba, bottom: Rgba): Rgba {
  const mix = (t: number, b: number) => t * top.a + b * (1 - top.a);
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: 1 };
}

/** WCAG 2.x relative luminance. */
function relativeLuminance({ r, g, b }: Rgba): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: Rgba, b: Rgba): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const AA = 4.5;

describe('design tokens <-> globals.css sync', () => {
  const rootVars = parseRootVariables(globalsCss);

  it('declares every token as a --mouse-* custom property with the same value', () => {
    for (const [name, value] of Object.entries(cssVariables)) {
      expect(rootVars.has(name), `${name} missing from :root`).toBe(true);
      expect(rootVars.get(name), name).toBe(normalize(value));
    }
  });

  it('declares no --mouse-* property that is not a token', () => {
    const known = new Set(Object.keys(cssVariables));
    const extra = [...rootVars.keys()].filter((name) => !known.has(name));
    expect(extra).toEqual([]);
  });

  it('references only defined --mouse-* variables', () => {
    const refs = [...globalsCss.matchAll(/var\((--mouse-[a-z0-9-]+)\)/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) expect(cssVariables, ref).toHaveProperty([ref]);
  });

  it('keeps body and .mouseai-light rules on variables, not hard-coded colors', () => {
    const rules = globalsCss.replace(/:root\s*\{[\s\S]*?\}/, '');
    expect(rules).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(rules).not.toMatch(/rgba?\(/i);
    expect(rules).toMatch(/body\s*\{[^}]*background:\s*var\(--mouse-color-bg\)/);
    expect(rules).toMatch(/body\s*\{[^}]*color:\s*var\(--mouse-color-text-primary\)/);
  });

  it('preserves the original white/transparent visual values', () => {
    expect(colors.bg).toBe('#ffffff');
    expect(colors.textPrimary).toBe('#0f172a');
    expect(colors.textStrong).toBe('#1e293b');
    expect(colors.textSecondary).toBe('#334155');
    expect(colors.textMuted).toBe('#64748b');
    expect(colors.surfaceGlass).toBe('rgba(248, 250, 252, 0.88)');
    expect(colors.surface).toBe('#f8fafc');
    expect(colors.border).toBe('#e2e8f0');
  });

  it('keeps the tailwind entrypoint directives intact', () => {
    expect(globalsCss).toMatch(/@tailwind base;/);
    expect(globalsCss).toMatch(/@tailwind utilities;/);
  });
});

describe('WCAG AA contrast', () => {
  const bg = parseColor(colors.bg);
  const glassOverWhite = composite(parseColor(colors.surfaceGlass), parseColor('#ffffff'));

  it('computes known reference ratios correctly', () => {
    expect(contrastRatio(parseColor('#000000'), parseColor('#ffffff'))).toBeCloseTo(21, 5);
    expect(contrastRatio(parseColor('#ffffff'), parseColor('#ffffff'))).toBeCloseTo(1, 5);
    expect(glassOverWhite.a).toBe(1);
  });

  const textTokens = [
    'textPrimary',
    'textStrong',
    'textSecondary',
    'textMuted',
    'accent',
    'success',
    'warning',
    'danger',
  ] as const;

  for (const key of textTokens) {
    it(`${key} >= ${AA}:1 on bg`, () => {
      expect(contrastRatio(parseColor(colors[key]), bg)).toBeGreaterThanOrEqual(AA);
    });
    it(`${key} >= ${AA}:1 on glass surface composited over white`, () => {
      expect(contrastRatio(parseColor(colors[key]), glassOverWhite)).toBeGreaterThanOrEqual(AA);
    });
  }

  const pairs = [
    ['onAccent', 'accent'],
    ['onSuccess', 'success'],
    ['onWarning', 'warning'],
    ['onDanger', 'danger'],
  ] as const;

  for (const [fg, bgKey] of pairs) {
    it(`${fg} on ${bgKey} >= ${AA}:1`, () => {
      expect(contrastRatio(parseColor(colors[fg]), parseColor(colors[bgKey]))).toBeGreaterThanOrEqual(AA);
    });
  }
});
