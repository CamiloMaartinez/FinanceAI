import { useTheme } from '../context/ThemeContext';

// ─── Tipografía: Outfit ─────────────────────────────────────
// Geométrica y redondeada. Cada peso es una familia distinta (así la
// registra @expo-google-fonts), por eso los estilos usan `fontFamily` y
// NO `fontWeight`: en Android, combinar ambos con una fuente propia hace
// que el sistema invente una negrita falsa o vuelva a la fuente del sistema.
export const fonts = {
  light:     'Outfit_300Light',
  regular:   'Outfit_400Regular',
  medium:    'Outfit_500Medium',
  semibold:  'Outfit_600SemiBold',
  bold:      'Outfit_700Bold',
  extrabold: 'Outfit_800ExtraBold',
} as const;

const NAMED_WEIGHTS: Record<string, number> = {
  normal: 400, bold: 700, ultralight: 200, thin: 100, light: 300,
  regular: 400, medium: 500, semibold: 600, condensedBold: 700, heavy: 800, black: 900,
};

/** Familia de Outfit equivalente a un `fontWeight` (los estilos viejos usan pesos). */
export function fontForWeight(weight: string | number | undefined): string {
  const w = weight == null ? 400 : NAMED_WEIGHTS[weight] ?? (Number(weight) || 400);
  if (w <= 300) return fonts.light;
  if (w <= 400) return fonts.regular;
  if (w <= 500) return fonts.medium;
  if (w <= 600) return fonts.semibold;
  if (w <= 700) return fonts.bold;
  return fonts.extrabold;
}

// ─── Fondos pastel para íconos ──────────────────────────────
// Iguales en ambos temas: el ícono va encima en `ink` (morado oscuro), así
// que el contraste se mantiene aunque la hoja de atrás sea oscura.
export const pastels = {
  peach:    '#F8C98F',
  lavender: '#D9DAFB',
  mint:     '#CDEFD9',
  pink:     '#FBDDE6',
  sky:      '#CDEEF7',
  yellow:   '#FBEFB8',
  lilac:    '#E8D5F7',
  coral:    '#F9C9C0',
} as const;

export type PastelName = keyof typeof pastels;
export const PASTEL_LIST = Object.values(pastels);

/** Color de los íconos y del texto que va sobre un pastel. */
export const ink = '#2A1B6B';

// ─── Paleta clara ───────────────────────────────────────────
// Los textos secundarios son el morado del texto con opacidad, calibrada
// para pasar WCAG AA (4.5:1) sobre `background` y `surface`.
export const lightColors = {
  background:        '#F4F3FF',
  surface:           '#FFFFFF',
  surfaceSecondary:  '#EEECFB',
  surfaceTertiary:   '#E3E0F7',
  sheet:             '#FFFFFF',
  hero:              '#B9BCF6', // encabezado lavanda
  heroText:          '#2A1B6B',
  heroTextSecondary: 'rgba(42,27,107,0.78)',
  primary:           '#2E1A78', // morado profundo: botones y texto fuerte
  onPrimary:         '#FFFFFF',
  textPrimary:       '#2A1B6B',
  textSecondary:     'rgba(42,27,107,0.72)',
  textTertiary:      'rgba(42,27,107,0.65)',
  income:            '#467010', // verde lima oscurecido para texto (AA)
  expense:           '#A53AAD', // magenta oscurecido para texto (AA)
  lime:              '#8DBF3F', // lima decorativo (barras, puntos), no para texto
  magenta:           '#C95BD0', // magenta decorativo
  accent:            '#2E1A78',
  onAccent:          '#FFFFFF',
  blue:              '#3D5AD6',
  purple:            '#6B3FC9',
  orange:            '#B25E00',
  teal:              '#1F7F95',
  peach:             '#F8C98F', // botón principal del onboarding y destacados
  onPeach:           '#2A1B6B',
  pink:              '#FBDDE6', // encabezado rosa pastel (pantalla de monto)
  chip:              '#CDEEF7', // chip activo
  onChip:            '#2A1B6B',
  actionBg:          '#2A1B6B', // botón circular oscuro sobre el encabezado
  onAction:          '#FFFFFF',
  border:            'rgba(42,27,107,0.08)',
  borderStrong:      'rgba(42,27,107,0.16)',
  overlay:           'rgba(27,18,64,0.4)',
  shadow: {
    sm: { shadowColor: '#2A1B6B', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,  elevation: 2 },
    md: { shadowColor: '#2A1B6B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6 },
    lg: { shadowColor: '#2A1B6B', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 12 },
  },
};

// ─── Paleta oscura ──────────────────────────────────────────
// Índigo profundo; los acentos se aclaran para mantener el contraste.
export const darkColors: typeof lightColors = {
  background:        '#1B1240',
  surface:           '#241A55',
  surfaceSecondary:  '#2E2366',
  surfaceTertiary:   '#382C75',
  sheet:             '#2A2060',
  hero:              '#2C2170',
  heroText:          '#FFFFFF',
  heroTextSecondary: 'rgba(255,255,255,0.72)',
  primary:           '#2E1A78',
  onPrimary:         '#FFFFFF',
  textPrimary:       '#FFFFFF',
  textSecondary:     'rgba(255,255,255,0.7)',
  textTertiary:      'rgba(255,255,255,0.52)',
  income:            '#A9D65F',
  expense:           '#E58AEB',
  lime:              '#A9D65F',
  magenta:           '#E58AEB',
  accent:            '#B9BCF6', // lavanda: sobre índigo, el morado no se vería
  onAccent:          '#1B1240',
  blue:              '#8FA5FF',
  purple:            '#C9A8FF',
  orange:            '#FFB547',
  teal:              '#6FD3E6',
  peach:             '#F8C98F',
  onPeach:           '#2A1B6B',
  pink:              '#FBDDE6',
  chip:              '#CDEEF7',
  onChip:            '#2A1B6B',
  actionBg:          '#120B30',
  onAction:          '#FFFFFF',
  border:            'rgba(255,255,255,0.08)',
  borderStrong:      'rgba(255,255,255,0.16)',
  overlay:           'rgba(8,4,24,0.62)',
  shadow: {
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.35, shadowRadius: 3,  elevation: 2 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4,  shadowRadius: 12, elevation: 6 },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 24, elevation: 12 },
  },
};

export type ThemeColors = typeof lightColors;

// ─── Hook para usar colores según el tema activo ─────────────
export function useColors(): ThemeColors {
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
  key: 28,    // teclas del teclado numérico
  sheet: 32,  // hojas inferiores
  pill: 999,  // chips, píldoras, botones circulares
};

// Materiales translúcidos (§12 apple-design): peso = espesor percibido de
// la superficie. Más grande/estructural → blur más fuerte + sombra mayor.
// Los valores de tinte se aplican sobre el BlurView según el tema activo.
export const materials = {
  thin: {
    intensity: 28,
    tintDark:  'rgba(27,18,64,0.4)',
    tintLight: 'rgba(255,255,255,0.55)',
  },
  regular: {
    intensity: 48,
    tintDark:  'rgba(27,18,64,0.55)',
    tintLight: 'rgba(255,255,255,0.7)',
  },
  thick: {
    intensity: 80,
    tintDark:  'rgba(27,18,64,0.72)',
    tintLight: 'rgba(255,255,255,0.82)',
  },
};

export const typography = {
  display:    { fontSize: 40, lineHeight: 46, fontFamily: fonts.extrabold, letterSpacing: -1 },
  largeTitle: { fontSize: 32, lineHeight: 38, fontFamily: fonts.bold,      letterSpacing: -0.8 },
  title:      { fontSize: 22, lineHeight: 28, fontFamily: fonts.semibold,  letterSpacing: -0.4 },
  headline:   { fontSize: 17, lineHeight: 22, fontFamily: fonts.semibold,  letterSpacing: -0.2 },
  body:       { fontSize: 15, lineHeight: 21, fontFamily: fonts.regular,   letterSpacing: 0 },
  caption:    { fontSize: 12, lineHeight: 16, fontFamily: fonts.medium,    letterSpacing: 0.1 },
  label:      { fontSize: 11, lineHeight: 14, fontFamily: fonts.medium,    letterSpacing: 0.6, textTransform: 'uppercase' as const },
};

/** Para montos: los dígitos tienen el mismo ancho y no "bailan" al cambiar. */
export const tabularNums = { fontVariant: ['tabular-nums' as const] };
