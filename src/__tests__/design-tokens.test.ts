import { describe, expect, it } from 'vitest';
import { designTokens } from '@/src/styles/tokens';

function luminance(hex: string): number {
  const rgb = hex.slice(1).match(/.{2}/g)!.map((part) => parseInt(part, 16) / 255).map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function contrast(foreground: string, background: string): number {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}

describe('MouseAI design tokens', () => {
  it('keeps text and semantic colors WCAG AA on white', () => {
    const white = designTokens.color.background;
    expect(contrast(designTokens.color.text, white)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(designTokens.color.textMuted, white)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(designTokens.color.success, white)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(designTokens.color.danger, white)).toBeGreaterThanOrEqual(4.5);
  });
  it('exposes transparent surface and interaction tokens', () => {
    expect(designTokens.color.surface).toContain('rgba');
    expect(designTokens.radius.md).toBeTruthy();
    expect(designTokens.shadow.focus).toContain('rgb');
  });
});
