// Utilidades de color para decidir cómo pintar un ícono sobre su fondo.

/** "#RRGGBB" → [r, g, b] de 0 a 255. Devuelve null si el formato no es válido. */
export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Luminancia relativa WCAG (0 = negro, 1 = blanco). */
export function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Un pastel es lo bastante claro para llevar el ícono en tinta oscura encima. */
export function isPastel(hex: string): boolean {
  return luminance(hex) > 0.5;
}
