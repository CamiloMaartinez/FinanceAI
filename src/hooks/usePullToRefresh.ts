import { useCallback, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  PULL_REFRESH,
  rubberband,
  springCelebrate,
  springDefault,
  springMomentum,
  timingSpin,
} from '../constants/motion';
import { pullOffset, pullProgress, shouldRefresh } from '../utils/pullToRefresh';
import { haptics } from '../utils/haptics';

const IS_IOS = Platform.OS === 'ios';
// Cuánto recorrido de dedo "cuesta" el rubber band en Android
const RUBBER_DIMENSION = 600;

/**
 * Pull-to-refresh propio para un Animated.ScrollView.
 * - iOS: lo jalado sale del rebote nativo (contentOffset negativo).
 * - Android no rebota: un Pan con activación manual toma el gesto solo si
 *   la lista está arriba y el dedo baja, en simultáneo con el scroll.
 * Al soltar pasado el umbral, el contenido se queda bajado `hold` px
 * mientras carga; al terminar, la moneda rebota y todo vuelve con un
 * resorte. Todo es shared value: un toque a mitad de camino lo interrumpe.
 */
export function usePullToRefresh(onRefresh: () => Promise<unknown>, scrollY: SharedValue<number>) {
  const reduceMotion = useReducedMotion();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const gesturePull = useSharedValue(0);
  const hold = useSharedValue(0);
  const refreshing = useSharedValue(false);
  const spin = useSharedValue(0);
  const pop = useSharedValue(1);
  const touchStartY = useSharedValue(0);

  const nativePull = useDerivedValue(() => (IS_IOS ? Math.max(-scrollY.value, 0) : 0));
  const pulled = useDerivedValue(() => nativePull.value + gesturePull.value);
  /** Alto del hueco donde se dibuja la moneda. */
  const gap = useDerivedValue(() => Math.max(hold.value, pulled.value));
  const progress = useDerivedValue(() =>
    refreshing.value ? 1 : pullProgress(pulled.value, PULL_REFRESH.threshold),
  );

  // Una vibración suave al cruzar el umbral (una por cruce, no por cuadro)
  useAnimatedReaction(
    () => !refreshing.value && pulled.value >= PULL_REFRESH.threshold,
    (armed, wasArmed) => {
      if (armed && wasArmed === false) scheduleOnRN(haptics.light);
    },
  );

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pullOffset(nativePull.value, gesturePull.value, hold.value) }],
  }));

  const settle = () => {
    'worklet';
    refreshing.value = false;
    hold.value = withSpring(0, springDefault);
  };

  const run = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch {
      // La pantalla ya muestra su propio error; aquí solo se cierra la moneda
    }
    cancelAnimation(spin);
    if (reduceMotion) {
      spin.value = 0;
      settle();
    } else {
      // Termina la vuelta de frente y rebota antes de irse
      spin.value = withTiming(Math.ceil(spin.value / 360) * 360, timingSpin);
      pop.value = withSequence(
        withSpring(1.2, springCelebrate),
        withSpring(1, springCelebrate, () => settle()),
      );
    }
    setIsRefreshing(false);
    AccessibilityInfo.announceForAccessibility('Datos actualizados');
    // settle es un worklet que solo toca shared values: no cambia entre renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRefresh, reduceMotion, spin, pop]);

  const begin = () => {
    'worklet';
    refreshing.value = true;
    hold.value = PULL_REFRESH.hold;
    if (!reduceMotion) {
      spin.value = 0;
      spin.value = withRepeat(withTiming(360, timingSpin), -1, false);
    }
    scheduleOnRN(run);
  };

  /** Llamar desde onEndDrag del scroll con el contentOffset.y al soltar. */
  const onRelease = (offsetY: number) => {
    'worklet';
    if (!IS_IOS) return;
    if (shouldRefresh(Math.max(-offsetY, 0), PULL_REFRESH.threshold, refreshing.value)) begin();
  };

  /** Recarga sin gesto: la acción "Actualizar" del lector de pantalla. */
  const refresh = useCallback(() => {
    if (refreshing.value) return;
    refreshing.value = true;
    hold.value = withSpring(PULL_REFRESH.hold, springDefault);
    if (!reduceMotion) spin.value = withRepeat(withTiming(360, timingSpin), -1, false);
    run();
  }, [refreshing, hold, spin, reduceMotion, run]);

  const pan = Gesture.Pan()
    .enabled(!IS_IOS)
    .manualActivation(true)
    .onTouchesDown((e) => {
      touchStartY.value = e.allTouches[0]?.absoluteY ?? 0;
    })
    .onTouchesMove((e, manager) => {
      const dy = (e.allTouches[0]?.absoluteY ?? 0) - touchStartY.value;
      if (scrollY.value > 0 || dy < -8) manager.fail();
      else if (dy > 8) manager.activate();
    })
    .onUpdate((e) => {
      gesturePull.value = rubberband(Math.max(e.translationY, 0), RUBBER_DIMENSION);
    })
    .onEnd(() => {
      if (shouldRefresh(gesturePull.value, PULL_REFRESH.threshold, refreshing.value)) begin();
      gesturePull.value = withSpring(0, springMomentum);
    });

  return {
    /** Gesto para envolver el scroll (en iOS está deshabilitado). */
    pan,
    contentStyle,
    onRelease,
    refresh,
    isRefreshing,
    coin: { gap, progress, spin, pop },
  };
}
