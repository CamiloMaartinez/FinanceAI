import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useColors, radius } from '../../constants/theme';
import { projectMomentum, rubberband, springSheet } from '../../constants/motion';
import { GlassView } from './GlassView';

const OFFSCREEN = 1200;
const CLOSE_VELOCITY = 900; // px/s hacia abajo → cierra sin importar posición

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Bottom sheet reemplazando el <Modal animationType="fade"> repetido en los
 * 4 modales del proyecto. Fondo con blur que oscurece (§12 "dim to focus"),
 * arrastre 1:1 con resistencia hacia arriba (§9) y proyección de momentum
 * para decidir cerrar vs. volver a su lugar (§5-6).
 */
export function Sheet({ visible, onClose, children }: SheetProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(OFFSCREEN);
  const backdropOpacity = useSharedValue(0);
  const sheetHeight = useSharedValue(OFFSCREEN);

  const close = () => {
    translateY.value = withSpring(sheetHeight.value + insets.bottom + 40, springSheet, (finished) => {
      if (finished) runOnJS(setMounted)(false);
    });
    backdropOpacity.value = withTiming(0, { duration: 220 });
    onClose();
  };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      backdropOpacity.value = withTiming(1, { duration: 220 });
      // translateY se dispara a 0 desde onLayout la primera vez que medimos
      // el contenido (evita el "salto" de animar hacia un alto desconocido).
      if (sheetHeight.value !== OFFSCREEN) {
        translateY.value = withSpring(0, springSheet);
      }
    } else if (mounted) {
      translateY.value = withSpring(sheetHeight.value + insets.bottom + 40, springSheet, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
      backdropOpacity.value = withTiming(0, { duration: 220 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const onSheetLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (sheetHeight.value === OFFSCREEN) {
      sheetHeight.value = h;
      if (visible) translateY.value = withSpring(0, springSheet);
    } else {
      sheetHeight.value = h;
    }
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY < 0) {
        translateY.value = -rubberband(-e.translationY, sheetHeight.value || 400);
      } else {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      const projected = e.translationY + projectMomentum(e.velocityY);
      const shouldClose = e.velocityY > CLOSE_VELOCITY || projected > (sheetHeight.value || 400) * 0.3;
      if (shouldClose) {
        runOnJS(close)();
      } else {
        translateY.value = withSpring(0, springSheet);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!mounted) return null;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Cerrar">
            <View style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} />
          </Pressable>
        </Animated.View>

        <GestureDetector gesture={pan}>
          <Animated.View
            onLayout={onSheetLayout}
            style={[styles.sheet, { paddingBottom: insets.bottom + 12 }, sheetStyle]}
          >
            <GlassView weight="thick" style={styles.glass}>
              <View style={styles.handle} />
              {children}
            </GlassView>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  glass: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(128,128,128,0.4)',
    marginBottom: 8,
  },
});
