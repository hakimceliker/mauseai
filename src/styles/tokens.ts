export const designTokens = {
  color: {
    background: '#ffffff', surface: 'rgba(248, 250, 252, 0.88)', surfaceSolid: '#f8fafc',
    text: '#0f172a', textMuted: '#475569', border: '#e2e8f0', primary: '#2563eb',
    success: '#15803d', warning: '#a16207', danger: '#b91c1c',
  },
  radius: { sm: '0.375rem', md: '0.625rem', lg: '0.875rem' },
  shadow: { card: '0 1px 2px rgb(15 23 42 / 0.06)', focus: '0 0 0 3px rgb(37 99 235 / 0.25)' },
  spacing: { page: '1.5rem', section: '1rem', control: '0.75rem' },
} as const;
