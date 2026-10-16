import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '../../constants/theme';
import { AMBIENT } from '../../constants/motion';

interface Blob {
  id: string;
  color: string;
  opacity: number;
  /** Diámetro y posición, en fracciones del ancho/alto de la pantalla. */
  size: number;
  x: number;
  y: number;
  /** Hasta dónde se desplaza en un ciclo. */
  dx: number;
  dy: number;
  scaleTo: number;
  durationMs: number;
}

/**
 * Fondo ambiental (J4), de los ambient-blob de Pixtta: 3 manchas lavanda y
 * magenta muy difuminadas (gradientes radiales) que van y vuelven en 40 s
 * o más. Decorativo, no recibe toques y se queda quieto con "reducir
 * movimiento".
 */
export function AmbientBackground() {
  const c = useColors();
  const { width, height } = useWindowDimensions();
  const blobs: Blob[] = [
    { id: 'a', color: c.lavender, opacity: 0.55, size: 1.1, x: -0.35, y: -0.15, dx: 0.18, dy: 0.1, scaleTo: 1.15, durationMs: AMBIENT.driftMs[0] },
    { id: 'b', color: c.magenta, opacity: 0.22, size: 1.2, x: 0.35, y: 0.3, dx: -0.15, dy: 0.08, scaleTo: 1.1, durationMs: AMBIENT.driftMs[1] },
    { id: 'c', color: c.lavender, opacity: 0.4, size: 0.9, x: 0.05, y: 0.7, dx: 0.12, dy: -0.1, scaleTo: 1.2, durationMs: AMBIENT.driftMs[2] },
  ];

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.clip]}
      testID="fondo-ambiental"
    >
      {blobs.map((b) => (
        <DriftingBlob key={b.id} blob={b} width={width} height={height} />
      ))}
    </View>
  );
}

function DriftingBlob({ blob, width, height }: { blob: Blob; width: number; height: number }) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);
  const d = blob.size * width;

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    t.value = withRepeat(
      withTiming(1, { duration: blob.durationMs, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.System }),
      -1,
      true,
    );
    return () => cancelAnimation(t);
  }, [reduceMotion, blob.durationMs, t]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: blob.dx * width * t.value },
      { translateY: blob.dy * height * t.value },
      { scale: 1 + (blob.scaleTo - 1) * t.value },
    ],
  }));

  const gradientId = `ambient-${blob.id}`;
  return (
    <Animated.View style={[{ position: 'absolute', left: blob.x * width, top: blob.y * height, width: d, height: d }, style]}>
      <Svg width={d} height={d}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={blob.color} stopOpacity={blob.opacity} />
            <Stop offset="0.55" stopColor={blob.color} stopOpacity={blob.opacity * 0.4} />
            <Stop offset="1" stopColor={blob.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={d / 2} cy={d / 2} r={d / 2} fill={`url(#${gradientId})`} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
