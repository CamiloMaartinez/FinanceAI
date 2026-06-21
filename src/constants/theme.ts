export const colors = {
  // Fondos
  background: '#000000',
  surface: '#1C1C1E',
  surfaceSecondary: '#2C2C2E',

  // Texto
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.6)',
  textTertiary: 'rgba(255,255,255,0.35)',

  // Colores semánticos
  income: '#34C759',
  expense: '#FF3B30',
  blue: '#007AFF',
  purple: '#5856D6',
  orange: '#FF9500',
  pink: '#FF2D55',
  teal: '#30B0C7',

  // Bordes
  border: 'rgba(255,255,255,0.08)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const typography = {
  largeTitle: { fontSize: 34, fontWeight: '700' as const },
  title:      { fontSize: 22, fontWeight: '600' as const },
  headline:   { fontSize: 17, fontWeight: '600' as const },
  body:       { fontSize: 15, fontWeight: '400' as const },
  caption:    { fontSize: 12, fontWeight: '400' as const },
};