import { describe, expect, it } from '@jest/globals';
import { lightColors, darkColors, pastels, ink, inkDanger } from '../src/constants/theme';
import { hexToRgb } from '../src/utils/color';

// Contraste WCAG 2.1 entre un texto (con su opacidad, si es rgba) y un fondo sólido
function parse(color: string): [number, number, number, number] {
  const rgba = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(color);
  if (rgba) return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), Number(rgba[4])];
  const rgb = hexToRgb(color);
  if (!rgb) throw new Error(`Color no válido: ${color}`);
  return [...rgb, 1];
}
function lum([r, g, b]: number[]): number {
  const [R, G, B] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}
function contrast(fg: string, bg: string): number {
  const [br, bgG, bb] = parse(bg);
  const [r, g, b, a] = parse(fg);
  const mixed = [r * a + br * (1 - a), g * a + bgG * (1 - a), b * a + bb * (1 - a)];
  const [l1, l2] = [lum(mixed), lum([br, bgG, bb])].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const AA = 4.5;

describe.each([
  ['claro', lightColors],
  ['oscuro', darkColors],
])('contraste del modo %s (WCAG AA, 4.5:1)', (_name, c) => {
  const surfaces = { background: c.background, surface: c.surface, sheet: c.sheet };

  it.each(['textPrimary', 'textSecondary', 'textTertiary', 'income', 'expense', 'accent', 'orange', 'blue', 'purple', 'teal'] as const)(
    '%s sobre fondo, superficie y hoja',
    (token) => {
      for (const bg of Object.values(surfaces)) {
        expect(contrast(c[token], bg)).toBeGreaterThanOrEqual(AA);
      }
    }
  );

  it('texto del encabezado lavanda', () => {
    expect(contrast(c.heroText, c.hero)).toBeGreaterThanOrEqual(AA);
    expect(contrast(c.heroTextSecondary, c.hero)).toBeGreaterThanOrEqual(AA);
  });

  it('texto sobre botones y chips', () => {
    expect(contrast(c.onAccent, c.accent)).toBeGreaterThanOrEqual(AA);
    expect(contrast(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(AA);
    expect(contrast(c.onPeach, c.peach)).toBeGreaterThanOrEqual(AA);
    expect(contrast(c.onChip, c.chip)).toBeGreaterThanOrEqual(AA);
    expect(contrast(c.onAction, c.actionBg)).toBeGreaterThanOrEqual(AA);
  });
});

describe('pasteles', () => {
  it.each(Object.entries(pastels))('la tinta se lee sobre %s', (_name, bg) => {
    expect(contrast(ink, bg)).toBeGreaterThanOrEqual(AA);
  });

  it('el aviso de "supera lo disponible" se lee sobre los encabezados pastel', () => {
    for (const bg of [pastels.pink, pastels.mint, pastels.sky]) {
      expect(contrast(inkDanger, bg)).toBeGreaterThanOrEqual(AA);
    }
  });
});
