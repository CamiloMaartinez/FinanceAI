import React from 'react';
import { StyleSheet, View } from 'react-native';

interface BrandMarkProps {
  /** Alto de la barra más alta. */
  size?: number;
  color: string;
  /** Las dos barras bajas, un poco más suaves que la alta. */
  mutedColor?: string;
}

/**
 * El símbolo de FinanceAI (tres barras que suben) dibujado con vistas, para
 * pintarlo con los colores del tema sobre fondos oscuros (splash, cortina).
 * Decorativo: quien lo use pone el texto accesible.
 */
export function BrandMark({ size = 56, color, mutedColor }: BrandMarkProps) {
  const bar = size * 0.25;
  const gap = size * 0.08;
  const soft = mutedColor ?? color;
  const heights = [0.45, 0.72, 1];
  return (
    <View
      style={[styles.row, { gap, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {heights.map((h, i) => (
        <View
          key={i}
          style={{
            width: bar,
            height: size * h,
            borderRadius: bar / 2.5,
            backgroundColor: i === heights.length - 1 ? color : soft,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
});
