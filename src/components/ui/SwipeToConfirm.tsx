import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  ReduceMotion,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColors, fonts, radius } from '../../constants/theme';
import { hapticHeavy, hapticToggle } from '../../utils/haptics';
import { Text } from './Text';

const HEIGHT = 64;
const PADDING = 6;
const THUMB = HEIGHT - PADDING * 2;
const CONFIRM_AT = 0.85; // fracción del recorrido para confirmar

// El pulgar vuelve con un rebote si no llegó al final
const springBack = { dampingRatio: 0.55, duration: 450, reduceMotion: ReduceMotion.System };
const springEnd = { dampingRatio: 1, duration: 200, reduceMotion: ReduceMotion.System };

interface SwipeToConfirmProps {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
  /** Color de la pista y del pulgar. */
  color?: string;
}

/**
 * "Desliza para confirmar". Con lector de pantalla se activa con la acción
 * accesible (doble toque), sin necesidad de arrastrar.
 */
export function SwipeToConfirm({ label, onConfirm, disabled, color }: SwipeToConfirmProps) {
  const c = useColors();
  const tint = color ?? c.primary;
  const [trackWidth, setTrackWidth] = useState(0);
  const x = useSharedValue(0);
  const max = Math.max(trackWidth - THUMB - PADDING * 2, 1);

  const confirm = () => {
    hapticHeavy();
    onConfirm();
    // Queda listo para la próxima vez
    setTimeout(() => { x.value = withSpring(0, springBack); }, 400);
  };

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onBegin(() => runOnJS(hapticToggle)())
    .onUpdate((e) => {
      x.value = Math.min(Math.max(e.translationX, 0), max);
    })
    .onEnd(() => {
      if (x.value >= max * CONFIRM_AT) {
        x.value = withSpring(max, springEnd);
        runOnJS(confirm)();
      } else {
        x.value = withSpring(0, springBack);
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, max * 0.6], [1, 0], 'clamp') }));
  const fillStyle = useAnimatedStyle(() => ({ width: x.value + THUMB + PADDING }));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: tint + '22' }, disabled && styles.disabled]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Desliza el círculo hacia la derecha, o toca dos veces con el lector de pantalla"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityActions={[{ name: 'activate', label }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'activate' && !disabled) confirm();
      }}
    >
      <Animated.View style={[styles.fill, { backgroundColor: tint + '33' }, fillStyle]} />
      <Animated.View style={[styles.labelWrap, labelStyle]} pointerEvents="none">
        <Text style={[styles.label, { color: tint === c.primary ? c.textPrimary : tint }]}>{label}</Text>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.thumb, { backgroundColor: tint }, thumbStyle]}>
          <Ionicons name="chevron-forward" size={26} color={c.onPrimary} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: HEIGHT, borderRadius: radius.pill, padding: PADDING, justifyContent: 'center', overflow: 'hidden' },
  disabled: { opacity: 0.45 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radius.pill },
  labelWrap: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', paddingLeft: THUMB },
  label: { fontFamily: fonts.bold, fontSize: 16 },
  thumb: { width: THUMB, height: THUMB, borderRadius: THUMB / 2, alignItems: 'center', justifyContent: 'center' },
});
