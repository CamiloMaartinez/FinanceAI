import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useColors, fonts, tabularNums } from '../constants/theme';
import { SPLASH, timingCurtainOut, timingFadeReduced, timingSplash } from '../constants/motion';
import { formatSplashCount, splashTarget } from '../utils/bootProgress';
import { BrandMark } from './ui/BrandMark';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const noFontPadding = Platform.OS === 'android' ? { includeFontPadding: false } : null;

interface SplashScreenProps {
  /** Avance real del arranque, de 0 a 1 (ver `bootProgress`). */
  progress: number;
  /** La app ya puede mostrarse: la barra completa y la pantalla sube. */
  ready: boolean;
  /** Mientras Outfit no cargue, los textos usan la fuente del sistema. */
  fontsReady: boolean;
  /** El splash terminó de salir: ya se puede desmontar. */
  onFinish: () => void;
}

/**
 * Pantalla de carga de marca (I2), al estilo del BrandLoader de Pixtta:
 * símbolo, barra lavanda y contador 000→100 que avanzan con los pasos reales
 * del arranque. Al terminar, el contenido se desvanece y la pantalla sube
 * como una cortina dejando ver la app, que ya está montada debajo.
 * No alarga el arranque: si todo ya está listo, la barra completa de una.
 */
export function SplashScreen({ progress, ready, fontsReady, onFinish }: SplashScreenProps) {
  const c = useColors();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const finished = useRef(false);

  const shown = useSharedValue(0);
  const contentOpacity = useSharedValue(1);
  const overlayOpacity = useSharedValue(1);
  const lift = useSharedValue(0);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onFinish();
  };

  const leave = () => {
    setLeaving(true);
    if (reduceMotion) {
      overlayOpacity.value = withTiming(0, timingFadeReduced, (done) => {
        if (done) runOnJS(finish)();
      });
      return;
    }
    contentOpacity.value = withTiming(0, {
      duration: SPLASH.fadeMs,
      easing: Easing.in(Easing.quad),
      reduceMotion: ReduceMotion.System,
    });
    lift.value = withDelay(
      SPLASH.curtainDelayMs,
      withTiming(-height, timingCurtainOut, (done) => {
        if (done) runOnJS(finish)();
      }),
    );
  };

  const target = splashTarget(progress, ready);
  useEffect(() => {
    // Interrumpible: cada paso nuevo sigue desde donde iba la barra
    shown.value = withTiming(target, timingSplash, (done) => {
      if (done && target === 1) runOnJS(leave)();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  // Seguro: aunque una animación se corte, el splash nunca se queda encima
  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(finish, SPLASH.maxTotalMs);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    transform: [{ translateY: lift.value }],
  }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: shown.value }] }));
  const countProps = useAnimatedProps(() => {
    const text = formatSplashCount(shown.value);
    return { text, defaultValue: text } as unknown as TextInputProps;
  });

  const font = (family: string) => (fontsReady ? { fontFamily: family } : { fontWeight: '800' as const });

  return (
    <Animated.View
      testID="splash"
      pointerEvents={leaving ? 'none' : 'auto'}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando FinanceAI"
      style={[StyleSheet.absoluteFill, { backgroundColor: c.primary }, overlayStyle]}
    >
      <Animated.View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[
          styles.inner,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          contentStyle,
        ]}
      >
        <Text style={[styles.eyebrow, font(fonts.semibold), { color: c.lavender }]}>Tus finanzas, claras</Text>

        <View style={styles.center}>
          <BrandMark size={64} color={c.onPrimary} mutedColor={c.lavender} />
          <View style={[styles.track, { backgroundColor: c.lavender + '26' }]}>
            <Animated.View style={[styles.fill, { backgroundColor: c.lavender }, barStyle]} />
          </View>
        </View>

        <View style={styles.bottom}>
          <Text style={[styles.eyebrow, font(fonts.semibold), { color: c.lavender }]}>FinanceAI</Text>
          <AnimatedTextInput
            testID="splash-contador"
            editable={false}
            pointerEvents="none"
            caretHidden
            underlineColorAndroid="transparent"
            defaultValue="000"
            animatedProps={countProps}
            style={[styles.count, font(fonts.extrabold), tabularNums, noFontPadding, { color: c.onPrimary }]}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  inner: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24 },
  eyebrow: { fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  center: { alignItems: 'center', gap: 28 },
  track: { width: 220, height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { width: '100%', height: '100%', transformOrigin: 'left' },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  count: { fontSize: 72, lineHeight: 72, letterSpacing: -2, padding: 0, margin: 0 },
});
