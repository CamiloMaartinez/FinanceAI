import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useColors, fonts, radius, spacing, pastels, type ThemeColors } from '../constants/theme';
import { springMomentum } from '../constants/motion';
import { markOnboardingSeen } from '../services/onboarding';
import { useAccessibilityPreferences } from '../hooks/useAccessibilityPreferences';
import { CategoryBadge } from './icons/CategoryBadge';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { Text } from './ui/Text';
import { hapticToggle, hapticSave } from '../utils/haptics';

interface OnboardingProps {
  profileId: string;
  onFinish: () => void;
}

const SLIDES = [
  {
    title: 'Tu dinero, bajo control',
    description: 'Bienvenido a FinanceAI: tus finanzas claras y una IA de tu lado. Te mostramos lo esencial en menos de un minuto.',
  },
  {
    title: 'Organiza tus finanzas',
    description: 'Registra cuentas y movimientos, y define un presupuesto mensual con alertas cuando te acerques al límite.',
  },
  {
    title: 'Alcanza tus metas',
    description: 'Crea metas de ahorro, controla tus suscripciones y compara tarjetas e inversiones, todo en un solo lugar.',
  },
  {
    title: 'Un asistente con IA',
    description: 'Pregúntale por tus finanzas, evalúa si puedes comprar algo y recibe un resumen cada lunes.',
  },
];

// Monedas e íconos que flotan en la parte de arriba: posición relativa al
// ancho de pantalla, tamaño, ícono y color. Cada uno con su propio ritmo.
const FLOATERS = [
  { icon: 'peso',        color: pastels.peach,    x: 0.08, y: 40,  size: 64, duration: 3600, delay: 0 },
  { icon: 'dolar',       color: pastels.mint,     x: 0.68, y: 20,  size: 72, duration: 4200, delay: 400 },
  { icon: 'euro',        color: pastels.sky,      x: 0.42, y: 120, size: 56, duration: 3900, delay: 900 },
  { icon: 'ahorro',      color: pastels.pink,     x: 0.1,  y: 190, size: 60, duration: 4600, delay: 300 },
  { icon: 'inversiones', color: pastels.yellow,   x: 0.72, y: 170, size: 58, duration: 4000, delay: 700 },
  { icon: 'cripto',      color: pastels.lavender, x: 0.44, y: 250, size: 48, duration: 3400, delay: 1200 },
];

export function Onboarding({ profileId, onFinish }: OnboardingProps) {
  const c = useColors();
  const s = useMemo(() => createStyles(c), [c]);
  const { reduceMotion } = useAccessibilityPreferences();
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const handleFinish = async () => {
    await markOnboardingSeen(profileId);
    onFinish();
  };
  const handleNext = () => (isLast ? handleFinish() : setIndex((i) => i + 1));

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" />
      <View style={s.topBar}>
        {!isLast && (
          <AnimatedPressable
            style={s.skip}
            onPress={handleFinish}
            hitSlop={8}
            onPressFeedback={hapticToggle}
            accessibilityRole="button"
            accessibilityLabel="Saltar la introducción"
          >
            <Text style={s.skipText}>Saltar</Text>
          </AnimatedPressable>
        )}
      </View>

      <View style={s.floatArea} accessible={false} importantForAccessibility="no-hide-descendants">
        {FLOATERS.map((f, i) => (
          <Floater key={f.icon} {...f} index={i} still={reduceMotion} />
        ))}
      </View>

      <Animated.View key={index} entering={reduceMotion ? FadeIn.duration(150) : FadeInDown.duration(380)} style={s.content}>
        <Text style={s.title} accessibilityRole="header">{slide.title}</Text>
        <Text style={s.description}>{slide.description}</Text>
      </Animated.View>

      <View style={s.footer}>
        <View style={s.dots} accessibilityRole="tablist">
          {SLIDES.map((item, i) => (
            <PageDot
              key={i}
              active={i === index}
              label={`Página ${i + 1} de ${SLIDES.length}: ${item.title}`}
              onPress={() => setIndex(i)}
              s={s}
              c={c}
            />
          ))}
        </View>

        <AnimatedPressable
          style={s.next}
          onPress={handleNext}
          onPressFeedback={hapticSave}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Empezar' : 'Siguiente'}
        >
          <Text style={s.nextText}>{isLast ? 'Empezar' : 'Siguiente'}</Text>
          <Ionicons name="arrow-forward" size={20} color={c.onPeach} />
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

function Floater({ icon, color, x, y, size, duration, delay, index, still }: {
  icon: string; color: string; x: number; y: number; size: number; duration: number; delay: number; index: number; still: boolean;
}) {
  const { width } = useWindowDimensions();
  const float = useSharedValue(0);
  const appear = useSharedValue(still ? 1 : 0);

  useEffect(() => {
    if (still) return;
    appear.value = withDelay(index * 90, withSpring(1, springMomentum));
    // Sube y baja despacio, cada uno desfasado; rota un poco al mismo ritmo
    float.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(-1, { duration, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, [still, appear, float, delay, duration, index]);

  const style = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [
      { translateY: float.value * 12 },
      { rotate: `${float.value * 8}deg` },
      { scale: 0.6 + appear.value * 0.4 },
    ],
  }));

  return (
    <Animated.View style={[{ position: 'absolute', left: x * width, top: y }, style]}>
      <CategoryBadge iconName={icon} colorHex={color} size={size} />
    </Animated.View>
  );
}

function PageDot({ active, label, onPress, s, c }: {
  active: boolean; label: string; onPress: () => void; s: ReturnType<typeof createStyles>; c: ThemeColors;
}) {
  const width = useSharedValue(active ? 28 : 8);
  useEffect(() => {
    width.value = withSpring(active ? 28 : 8, springMomentum);
  }, [active, width]);
  const style = useAnimatedStyle(() => ({ width: width.value }));

  return (
    <AnimatedPressable
      onPress={onPress}
      hitSlop={10}
      onPressFeedback={hapticToggle}
      pressScale={0.9}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Animated.View style={[s.dot, { backgroundColor: active ? c.peach : 'rgba(255,255,255,0.35)' }, style]} />
    </AnimatedPressable>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    // Morado profundo en ambos temas: es la portada de la app
    container: { flex: 1, backgroundColor: c.primary },
    topBar: { height: 52, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: spacing.lg },
    skip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    skipText: { fontFamily: fonts.semibold, fontSize: 15, color: 'rgba(255,255,255,0.8)' },
    floatArea: { height: 320 },
    content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xxl },
    title: { fontFamily: fonts.extrabold, fontSize: 40, lineHeight: 46, letterSpacing: -1, color: c.onPrimary, marginBottom: spacing.md },
    description: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: 'rgba(255,255,255,0.82)' },
    footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xl },
    dots: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.sm },
    dot: { height: 8, borderRadius: 4 },
    next: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: c.peach,
      borderRadius: radius.pill,
      paddingVertical: spacing.lg + 2,
    },
    nextText: { fontFamily: fonts.bold, fontSize: 17, color: c.onPeach },
  });
}
