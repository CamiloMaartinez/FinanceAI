import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/ThemeContext';
import { materials, useColors } from '../../constants/theme';
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences';

interface GlassViewProps {
  /** Espesor del material — superficies grandes/estructurales piden más peso (§12). */
  weight?: keyof typeof materials;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Capa de material translúcido (apple-design §12). Sobre `prefers-reduced-
 * transparency` cae a una superficie casi sólida sin blur (§14), en vez de
 * simplemente ignorar la preferencia.
 */
export function GlassView({ weight = 'regular', style, children }: GlassViewProps) {
  const { isDark } = useTheme();
  const c = useColors();
  const { reduceTransparency } = useAccessibilityPreferences();
  const m = materials[weight];
  const tint = isDark ? m.tintDark : m.tintLight;

  // En Android, BlurView sin BlurTargetView no difumina: solo pinta el tinte
  // semitransparente y el contenido de atrás se transparenta. Mejor sólido.
  if (reduceTransparency || Platform.OS === 'android') {
    return <View style={[style, { backgroundColor: c.surface }]}>{children}</View>;
  }

  return (
    <BlurView
      intensity={m.intensity}
      tint={isDark ? 'dark' : 'light'}
      style={style}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
      {children}
    </BlurView>
  );
}
