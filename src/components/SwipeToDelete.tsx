import React from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Text } from './ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '../constants/theme';
import { springDefault, springMomentum, projectMomentum, rubberband } from '../constants/motion';
import { hapticDelete, hapticToggle } from '../utils/haptics';
import { AnimatedPressable } from './ui/AnimatedPressable';

const SWIPE_THRESHOLD = -70; // qué tanto hay que deslizar para que "abra"
const MAX_SWIPE = -90;       // dónde queda enganchado el panel de eliminar

interface SwipeToDeleteProps {
  children: React.ReactNode;
  onDelete: () => void;
}

/**
 * Desliza hacia la izquierda para revelar "Eliminar". Reescrito sobre
 * gesture-handler + reanimated (antes PanResponder/Animated legacy):
 * seguimiento 1:1, resistencia progresiva al pasar los límites (§9) y
 * proyección de momentum para decidir abrir/cerrar en vez de un umbral
 * fijo desde el punto de soltar (§5-6).
 */
export function SwipeToDelete({ children, onDelete }: SwipeToDeleteProps) {
  const c = useColors();
  const translateX = useSharedValue(0);
  const isOpen = useSharedValue(false);
  const rowWidth = useSharedValue(360);

  const onRowLayout = (e: LayoutChangeEvent) => {
    rowWidth.value = e.nativeEvent.layout.width || rowWidth.value;
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      const base = isOpen.value ? MAX_SWIPE : 0;
      const next = base + e.translationX;
      if (next > 0) {
        translateX.value = rubberband(next, rowWidth.value);
      } else if (next < MAX_SWIPE) {
        translateX.value = MAX_SWIPE - rubberband(MAX_SWIPE - next, rowWidth.value);
      } else {
        translateX.value = next;
      }
    })
    .onEnd((e) => {
      const base = isOpen.value ? MAX_SWIPE : 0;
      const projected = base + e.translationX + projectMomentum(e.velocityX);
      const nextOpen = projected < SWIPE_THRESHOLD;
      if (nextOpen !== isOpen.value) runOnJS(hapticToggle)();
      isOpen.value = nextOpen;
      translateX.value = withSpring(nextOpen ? MAX_SWIPE : 0, nextOpen ? springMomentum : springDefault);
    });

  const handleDelete = () => {
    hapticDelete();
    translateX.value = withTiming(-420, { duration: 200 }, (finished) => {
      if (finished) runOnJS(onDelete)();
    });
  };

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.wrapper} onLayout={onRowLayout}>
      <View style={[StyleSheet.absoluteFill, styles.deleteBg, { backgroundColor: c.expense }]}>
        <AnimatedPressable style={styles.deleteBtn} onPress={handleDelete} hitSlop={8} onPressFeedback={undefined}>
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <Text style={styles.deleteText}>Eliminar</Text>
        </AnimatedPressable>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.foreground, { backgroundColor: c.background }, rowStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { overflow: 'hidden' },
  deleteBg: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deleteText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  foreground: {},
});
