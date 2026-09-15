import { useTheme } from '../context/ThemeContext';

// ─── Paleta oscura ──────────────────────────────────────────
export const darkColors = {
  background:       '#000000',
  surface:          '#0A0A0A',
  surfaceSecondary: '#111111',
  surfaceTertiary:  '#1A1A1A',
  textPrimary:      '#FFFFFF',
  textSecondary:    'rgba(255,255,255,0.5)',
  textTertiary:     'rgba(255,255,255,0.25)',
  income:           '#2DB87A',
  expense:          '#E55A4E',
  accent:           '#2DB87A',
  blue:             '#2DB87A',
  purple:           '#2DB87A',
  orange:           '#E5A44E',
  pink:             '#E55A4E',
  teal:             '#2DB87A',
  border:           'rgba(255,255,255,0.06)',
  borderStrong:     'rgba(255,255,255,0.12)',
};

// ─── Paleta clara ───────────────────────────────────────────
export const lightColors = {
  background:       '#FAFAFA',
  surface:          '#FFFFFF',
  surfaceSecondary: '#F5F5F5',
  surfaceTertiary:  '#EBEBEB',
  textPrimary:      '#0A0A0A',
  textSecondary:    'rgba(0,0,0,0.5)',
  textTertiary:     'rgba(0,0,0,0.3)',
  income:           '#1A9E65',
  expense:          '#C94035',
  accent:           '#1A9E65',
  blue:             '#1A9E65',
  purple:           '#1A9E65',
  orange:           '#C47B1A',
  pink:             '#C94035',
  teal:             '#1A9E65',
  border:           'rgba(0,0,0,0.06)',
  borderStrong:     'rgba(0,0,0,0.12)',
};

// ─── Hook para usar colores según el tema activo ─────────────
export function useColors() {
  const { isDark } = useTheme();
  return isDark ? darkColors : lightColors;
}

// Compatibilidad: los componentes que usan `colors` directamente
// siguen funcionando con los colores oscuros por defecto
export const colors = darkColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
};

export const typography = {
  largeTitle: { fontSize: 34, fontWeight: '200' as const, letterSpacing: -1 },
  title:      { fontSize: 22, fontWeight: '300' as const, letterSpacing: -.5 },
  headline:   { fontSize: 17, fontWeight: '400' as const },
  body:       { fontSize: 15, fontWeight: '300' as const },
  caption:    { fontSize: 11, fontWeight: '400' as const, letterSpacing: .06 },
  label:      { fontSize: 10, fontWeight: '500' as const, letterSpacing: .1, textTransform: 'uppercase' as const },
};