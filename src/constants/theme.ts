export const colors = {
  // Base
  background: '#000000',
  surface: '#0A0A0A',
  surfaceSecondary: '#111111',
  surfaceTertiary: '#1A1A1A',

  // Texto
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.5)',
  textTertiary: 'rgba(255,255,255,0.25)',

  // Semánticos — solo dos colores de acento
  income: '#2DB87A',      // Verde esmeralda
  expense: '#E55A4E',     // Rojo suave
  accent: '#2DB87A',      // Acento principal

  // Compatibilidad con módulos existentes
  blue: '#2DB87A',
  purple: '#2DB87A',
  orange: '#E5A44E',
  pink: '#E55A4E',
  teal: '#2DB87A',

  // Bordes ultra finos
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.12)',
};

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
  title: { fontSize: 22, fontWeight: '300' as const, letterSpacing: -.5 },
  headline: { fontSize: 17, fontWeight: '400' as const },
  body: { fontSize: 15, fontWeight: '300' as const },
  caption: { fontSize: 11, fontWeight: '400' as const, letterSpacing: .06 },
  label: { fontSize: 10, fontWeight: '500' as const, letterSpacing: .1, textTransform: 'uppercase' as const },
};