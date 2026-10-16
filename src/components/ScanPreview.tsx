import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useColors, radius } from '../constants/theme';
import { timingLaser, timingZoomIn } from '../constants/motion';

const HEIGHT = 180;
const GLOW = 28;

/**
 * Foto del recibo mientras la IA la lee (D6): entra con un zoom lento de
 * 1,14 a 1 y después una línea láser la recorre de arriba abajo hasta que
 * termina el escaneo. Decorativa: el texto del botón dice qué pasa.
 * Con "reducir movimiento" solo aparece, sin zoom ni láser.
 */
export function ScanPreview({ uri }: { uri: string }) {
  const c = useColors();
  const reduceMotion = useReducedMotion();
  const zoom = useSharedValue(reduceMotion ? 1 : 1.14);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    zoom.value = withTiming(1, timingZoomIn);
    // El láser empieza cuando la foto ya se asentó
    sweep.value = withDelay(timingZoomIn.duration ?? 900, withRepeat(withTiming(1, timingLaser), -1, true));
    return () => {
      cancelAnimation(zoom);
      cancelAnimation(sweep);
    };
  }, [reduceMotion, zoom, sweep]);

  const photoStyle = useAnimatedStyle(() => ({ transform: [{ scale: zoom.value }] }));
  const laserStyle = useAnimatedStyle(() => ({
    // Aparece suave al arrancar el barrido
    opacity: Math.min(sweep.value * 8, 1),
    transform: [{ translateY: sweep.value * (HEIGHT - GLOW) }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[styles.frame, { backgroundColor: c.surfaceSecondary }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="recibo-escaneando"
    >
      <Animated.View style={[StyleSheet.absoluteFill, photoStyle]}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </Animated.View>
      {!reduceMotion && (
        <Animated.View style={[styles.laser, laserStyle]}>
          <LinearGradient
            colors={['transparent', c.magenta + '55', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.beam, { backgroundColor: c.magenta, shadowColor: c.magenta }]} />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { height: HEIGHT, borderRadius: radius.md, overflow: 'hidden' },
  laser: { position: 'absolute', left: 0, right: 0, top: 0, height: GLOW, justifyContent: 'center' },
  beam: { height: 2, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
});
