import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
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
import { PULSE } from '../../constants/motion';

interface PulseDotProps {
  /** Por defecto, el magenta del tema. */
  color?: string;
  /** Diámetro del punto. */
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Punto "en vivo" (B5), el pulso del mapa de Pixtta: un anillo sale del
 * punto, crece de 1 a 2,4 y se desvanece de 0,6 a 0 en 1,8 s, en bucle.
 * Decorativo: quien lo use dice qué significa. Con "reducir movimiento"
 * queda solo el punto quieto.
 */
export function PulseDot({ color, size = 8, style, testID }: PulseDotProps) {
  const c = useColors();
  const tint = color ?? c.magenta;
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    t.value = withRepeat(
      withTiming(1, { duration: PULSE.durationMs, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System }),
      -1,
      false,
    );
    return () => cancelAnimation(t);
  }, [reduceMotion, t]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0 : PULSE.opacityFrom * (1 - t.value),
    transform: [{ scale: 1 + (PULSE.scaleTo - 1) * t.value }],
  }));

  const dot = { width: size, height: size, borderRadius: size / 2, backgroundColor: tint };
  return (
    <View
      testID={testID}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size }, style]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, dot, ringStyle]} />
      <View style={dot} />
    </View>
  );
}
