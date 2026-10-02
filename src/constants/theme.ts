import { useTheme } from '../context/ThemeContext';

// ─── Paleta oscura ──────────────────────────────────────────
// Colores de sistema iOS (Apple HIG) — cada matiz tiene su propio valor
// tuneado por apariencia, no solo una versión con opacidad distinta.
export const darkColors = {
  background:       '#000000',
  surface:          '#0A0A0A',
  surfaceSecondary: '#111111',
  surfaceTertiary:  '#1A1A1A',
  textPrimary:      '#FFFFFF',
  textSecondary:    'rgba(255,255,255,0.5)',
  textTertiary:     'rgba(255,255,255,0.25)',
  income:           '#30D158', // systemGreen (dark)
  expense:          '#FF453A', // systemRed (dark)
  accent:           '#0A84FF', // systemBlue (dark)
  blue:             '#0A84FF',
  purple:           '#BF5AF2', // systemPurple (dark)
  orange:           '#FF9F0A', // systemOrange (dark)
  pink:             '#FF375F', // systemPink (dark)
  teal:             '#40C8E0', // systemTeal (dark)
  border:           'rgba(255,255,255,0.06)',
  borderStrong:     'rgba(255,255,255,0.12)',
  overlay:          'rgba(0,0,0,0.62)',
  shadow: {
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.4,  shadowRadius: 3,  elevation: 2 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 6 },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
  },
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
  income:           '#34C759', // systemGreen (light)
  expense:          '#FF3B30', // systemRed (light)
  accent:           '#007AFF', // systemBlue (light)
  blue:             '#007AFF',
  purple:           '#AF52DE', // systemPurple (light)
  orange:           '#FF9500', // systemOrange (light)
  pink:             '#FF2D55', // systemPink (light)
  teal:             '#30B0C7', // systemTeal (light)
  border:           'rgba(0,0,0,0.06)',
  borderStrong:     'rgba(0,0,0,0.12)',
  overlay:          'rgba(0,0,0,0.35)',
  shadow: {
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,  elevation: 2 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 6 },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 12 },
  },
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

// Materiales translúcidos (§12 apple-design): peso = espesor percibido de
// la superficie. Más grande/estructural → blur más fuerte + sombra mayor.
// Los valores de tinte se aplican sobre el BlurView según el tema activo.
export const materials = {
  thin: {
    intensity: 28,
    tintDark:  'rgba(15,15,15,0.4)',
    tintLight: 'rgba(255,255,255,0.55)',
  },
  regular: {
    intensity: 48,
    tintDark:  'rgba(10,10,10,0.55)',
    tintLight: 'rgba(255,255,255,0.7)',
  },
  thick: {
    intensity: 80,
    tintDark:  'rgba(8,8,8,0.72)',
    tintLight: 'rgba(255,255,255,0.82)',
  },
};

export const typography = {
  largeTitle: { fontSize: 34, lineHeight: 38, fontWeight: '200' as const, letterSpacing: -1 },
  title:      { fontSize: 22, lineHeight: 27, fontWeight: '300' as const, letterSpacing: -.5 },
  headline:   { fontSize: 17, lineHeight: 22, fontWeight: '400' as const, letterSpacing: -.2 },
  body:       { fontSize: 15, lineHeight: 21, fontWeight: '300' as const, letterSpacing: 0 },
  caption:    { fontSize: 11, lineHeight: 14, fontWeight: '400' as const, letterSpacing: .06 },
  label:      { fontSize: 10, lineHeight: 13, fontWeight: '500' as const, letterSpacing: .1, textTransform: 'uppercase' as const },
};
