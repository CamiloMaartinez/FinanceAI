import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/ThemeContext';
import { materials } from '../../constants/theme';
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
  const { reduceTransparency } = useAccessibilityPreferences();
  const m = materials[weight];
  const tint = isDark ? m.tintDark : m.tintLight;

  if (reduceTransparency) {
    const solidTint = isDark ? 'rgba(12,12,12,0.96)' : 'rgba(255,255,255,0.96)';
    return <View style={[style, { backgroundColor: solidTint }]}>{children}</View>;
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
