import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '../../constants/theme';
import {
  CURTAIN,
  timingCurtainIn,
  timingCurtainOut,
  timingFadeReduced,
  timingMark,
} from '../../constants/motion';
import { LogoMark } from '../brand/LogoMark';

/** Lo que cambia la pantalla debajo de la cortina (puede ser asíncrono). */
export type CurtainSwap = () => void | Promise<void>;

export interface BrandCurtainHandle {
  /** Cubre, ejecuta `swap` y descubre. Termina cuando la cortina se abrió. */
  run: (swap: CurtainSwap) => Promise<void>;
}

/**
 * Cortina de marca (J1), traducida del PageTransition de Pixtta: dos paneles
 * (magenta y luego morado con el logo) suben y tapan la pantalla, debajo se
 * cambia de pantalla, y siguen subiendo para mostrarla. Solo para momentos
 * importantes: desbloqueo, fin del onboarding y cambio de perfil.
 *
 * Solo bloquea los toques mientras cubre. Si la pantalla nueva no llega en
 * 5 s, se abre igual. Con "reducir movimiento" es un fundido corto.
 */
export const BrandCurtain = forwardRef<BrandCurtainHandle>(function BrandCurtain(_, ref) {
  const c = useColors();
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [covering, setCovering] = useState(false);
  const busy = useRef(false);

  // Fuera de pantalla abajo (height) → cubriendo (0) → fuera arriba (-height)
  const back = useSharedValue(height);
  const front = useSharedValue(height);
  const mark = useSharedValue(0);
  const fade = useSharedValue(0);

  useImperativeHandle(
    ref,
    () => ({
      run: (swap) => {
        // Ya hay una en curso: el cambio se aplica igual, sin otra cortina
        if (busy.current) return Promise.resolve(swap()).then(() => {});
        busy.current = true;
        setCovering(true);

        return new Promise<void>((resolve) => {
          const finish = () => {
            back.value = height;
            front.value = height;
            busy.current = false;
            resolve();
          };

          const open = () => {
            setCovering(false); // desde aquí los toques ya pasan
            if (reduceMotion) {
              fade.value = withTiming(0, timingFadeReduced, () => runOnJS(finish)());
              return;
            }
            mark.value = withTiming(0, timingMark);
            // Sale primero el panel de adelante, como en la referencia
            front.value = withTiming(-height, timingCurtainOut);
            back.value = withDelay(
              CURTAIN.panelGapMs,
              withTiming(-height, timingCurtainOut, () => runOnJS(finish)()),
            );
          };

          const covered = () => {
            let revealed = false;
            const reveal = () => {
              if (revealed) return;
              revealed = true;
              clearTimeout(failsafe);
              open();
            };
            const failsafe = setTimeout(reveal, CURTAIN.failsafeMs);
            Promise.resolve()
              .then(swap)
              .catch(() => {})
              // Dos cuadros: la pantalla nueva ya se pintó debajo
              .then(() => requestAnimationFrame(() => requestAnimationFrame(reveal)));
          };

          if (reduceMotion) {
            fade.value = withTiming(1, timingFadeReduced, () => runOnJS(covered)());
            return;
          }
          back.value = height;
          front.value = height;
          back.value = withTiming(0, timingCurtainIn);
          front.value = withDelay(
            CURTAIN.panelGapMs,
            withTiming(0, timingCurtainIn, () => runOnJS(covered)()),
          );
          mark.value = withDelay(CURTAIN.panelGapMs + CURTAIN.markDelayMs, withTiming(1, timingMark));
        });
      },
    }),
    [back, front, mark, fade, height, reduceMotion],
  );

  const backStyle = useAnimatedStyle(() => ({ transform: [{ translateY: back.value }] }));
  const frontStyle = useAnimatedStyle(() => ({ transform: [{ translateY: front.value }] }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: mark.value,
    transform: [{ scale: 0.9 + mark.value * 0.1 }],
  }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <View
      testID="cortina"
      pointerEvents={covering ? 'auto' : 'none'}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      {reduceMotion ? (
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: c.primary }, fadeStyle]}>
          <LogoMark size={72} />
        </Animated.View>
      ) : (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.magenta }, backStyle]} />
          <Animated.View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: c.primary }, frontStyle]}>
            <Animated.View style={markStyle}>
              <LogoMark size={72} />
            </Animated.View>
          </Animated.View>
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
