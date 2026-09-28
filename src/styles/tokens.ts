/**
 * MouseAI design tokens — single source of truth.
 *
 * The product UI is white / transparent ("beyaz/şeffaf"): a white page,
 * slate text and translucent glass surfaces. Every value here is mirrored
 * as a CSS custom property (`--mouse-*`) in `src/app/globals.css`; the
 * `design-tokens` test fails if the two drift apart.
 *
 * See docs/design/design-system.md for usage rules.
 */

export const colors = {
  /** Page background. */
  bg: '#ffffff',
  /** Opaque raised surface (hover rows, cards without blur). */
  surface: '#f8fafc',
  /** Translucent glass surface; always rendered over `bg`. */
  surfaceGlass: 'rgba(248, 250, 252, 0.88)',
  /** Hairline borders and dividers. */
  border: '#e2e8f0',
  /** Headings and body text. */
  textPrimary: '#0f172a',
  /** Strong secondary text (sub-headings, labels). */
  textStrong: '#1e293b',
  /** Secondary body text. */
  textSecondary: '#334155',
  /** Muted text: captions, metadata, placeholders. */
  textMuted: '#64748b',
  /** Brand accent (links, focus, primary actions). */
  accent: '#0e7490',
  onAccent: '#ffffff',
  success: '#047857',
  onSuccess: '#ffffff',
  warning: '#b45309',
  onWarning: '#ffffff',
  danger: '#b91c1c',
  onDanger: '#ffffff',
} as const;

export const typography = {
  fontSans:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontMono:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
  size: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.625',
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  6: '1.5rem',
  8: '2rem',
  12: '3rem',
} as const;

export const radius = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
} as const;

export const shadow = {
  sm: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
  md: '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.06)',
  lg: '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.05)',
} as const;

export const blur = {
  sm: '4px',
  md: '12px',
} as const;

export const tokens = { colors, typography, spacing, radius, shadow, blur } as const;

function kebab(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Flat map of CSS custom property name -> value, e.g.
 * `--mouse-color-text-primary: #0f172a`. This is exactly what
 * `:root` in globals.css must declare.
 */
export function toCssVariables(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(colors)) vars[`--mouse-color-${kebab(k)}`] = v;
  vars['--mouse-font-sans'] = typography.fontSans;
  vars['--mouse-font-mono'] = typography.fontMono;
  for (const [k, v] of Object.entries(typography.size)) vars[`--mouse-text-${k}`] = v;
  for (const [k, v] of Object.entries(typography.lineHeight)) vars[`--mouse-leading-${k}`] = v;
  for (const [k, v] of Object.entries(typography.weight)) vars[`--mouse-font-weight-${k}`] = v;
  for (const [k, v] of Object.entries(spacing)) vars[`--mouse-space-${k}`] = v;
  for (const [k, v] of Object.entries(radius)) vars[`--mouse-radius-${k}`] = v;
  for (const [k, v] of Object.entries(shadow)) vars[`--mouse-shadow-${k}`] = v;
  for (const [k, v] of Object.entries(blur)) vars[`--mouse-blur-${k}`] = v;
  return vars;
}

export const cssVariables = toCssVariables();

/** `var(--mouse-...)` reference helper for inline styles. */
export function cssVar(name: keyof typeof cssVariables | string): string {
  return `var(${name})`;
}
