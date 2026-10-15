import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useColors, fonts, radius, spacing, type ThemeColors } from '../constants/theme';
import { springMomentum } from '../constants/motion';
import { markOnboardingSeen } from '../services/onboarding';
import { useAccessibilityPreferences } from '../hooks/useAccessibilityPreferences';
import { Mascot, type MascotPose } from './mascot/Mascot';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { Text } from './ui/Text';
import { hapticToggle, hapticSave } from '../utils/haptics';

interface OnboardingProps {
  profileId: string;
  onFinish: () => void;
}

// Cada diapositiva tiene su pose de Moni; al pasar de una a otra cambia de pose
const SLIDES: { title: string; description: string; pose: MascotPose }[] = [
  {
    pose: 'colgado',
    title: 'Tu dinero, bajo control',
    description: 'Bienvenido a Smart Finance: tus finanzas claras y una IA de tu lado. Te mostramos lo esencial en menos de un minuto.',
  },
  {
    pose: 'senalando',
    title: 'Organiza tus finanzas',
    description: 'Registra cuentas y movimientos, y define un presupuesto mensual con alertas cuando te acerques al límite.',
  },
  {
    pose: 'corriendo',
    title: 'Alcanza tus metas',
    description: 'Crea metas de ahorro, controla tus suscripciones y compara tarjetas e inversiones, todo en un solo lugar.',
  },
  {
    pose: 'celebrando',
    title: 'Un asistente con IA',
    description: 'Pregúntale por tus finanzas, evalúa si puedes comprar algo y recibe un resumen cada lunes.',
  },
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

      {/* El título ya explica la diapositiva: Moni es decorativa, pero se puede tocar */}
      <View style={s.floatArea}>
        <Mascot pose={slide.pose} size={260} tone="light" interactive decorative />
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
    floatArea: { height: 320, alignItems: 'center', justifyContent: 'center' },
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
