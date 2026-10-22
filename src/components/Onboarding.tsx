import React, { useEffect, useMemo } from 'react';
import { KeyboardAvoidingView, Platform, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useColors, fonts, radius, spacing, type ThemeColors } from '../constants/theme';
import { springMomentum } from '../constants/motion';
import { useAccessibilityPreferences } from '../hooks/useAccessibilityPreferences';
import { useOnboarding, type OnboardingStep } from '../hooks/useOnboarding';
import { INTERESTS, firstName, type Feature, type InterestId } from '../utils/onboardingPlan';
import { Mascot, type MascotPose } from './mascot/Mascot';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { Text } from './ui/Text';
import { TextInput } from './ui/TextInput';
import { hapticToggle, hapticSave } from '../utils/haptics';

interface OnboardingProps {
  profileId: string;
  onFinish: () => void;
}

type Styles = ReturnType<typeof createStyles>;

/** Título corto de cada paso, para los puntos de paginación. */
function stepLabel(step: OnboardingStep): string {
  switch (step.kind) {
    case 'welcome':   return 'Bienvenida';
    case 'name':      return 'Tu nombre';
    case 'interests': return 'Qué quieres lograr';
    case 'feature':   return step.feature.title;
    case 'ready':     return 'Todo listo';
  }
}

function stepPose(step: OnboardingStep): MascotPose {
  switch (step.kind) {
    case 'welcome':   return 'colgado';
    case 'name':      return 'saludando';
    case 'interests': return 'investigando';
    case 'feature':   return step.feature.pose;
    case 'ready':     return 'celebrando';
  }
}

/**
 * Bienvenida personalizada: pregunta el nombre y qué quiere lograr, y con
 * eso arma el recorrido por los servicios que más le sirven. Toda la lógica
 * vive en `useOnboarding`; aquí solo se dibuja.
 */
export function Onboarding({ profileId, onFinish }: OnboardingProps) {
  const c = useColors();
  const s = useMemo(() => createStyles(c), [c]);
  const { reduceMotion } = useAccessibilityPreferences();
  const vm = useOnboarding(profileId, onFinish);
  const { step, steps, index } = vm;
  const who = firstName(vm.name);

  // Los pasos con preguntas necesitan espacio: Moni se hace más pequeña
  const compact = step.kind === 'name' || step.kind === 'interests' || step.kind === 'ready';
  const nextLabel = vm.isLast ? 'Empezar' : step.kind === 'welcome' ? 'Personalizar' : 'Siguiente';

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.topBar}>
          {!vm.isFirst ? (
            <AnimatedPressable
              style={s.iconButton}
              onPress={vm.back}
              hitSlop={8}
              onPressFeedback={hapticToggle}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <Ionicons name="chevron-back" size={22} color={c.onPrimary} />
            </AnimatedPressable>
          ) : (
            <View />
          )}
          {!vm.isLast && (
            <AnimatedPressable
              style={s.skip}
              onPress={vm.finish}
              hitSlop={8}
              onPressFeedback={hapticToggle}
              accessibilityRole="button"
              accessibilityLabel="Saltar la introducción"
            >
              <Text style={s.skipText}>Saltar</Text>
            </AnimatedPressable>
          )}
        </View>

        {/* El título ya explica el paso: Moni es decorativa, pero se puede tocar */}
        <View style={compact ? s.floatAreaCompact : s.floatArea}>
          <Mascot pose={stepPose(step)} size={compact ? 130 : 240} tone="light" interactive decorative />
        </View>

        <Animated.View
          key={index}
          entering={reduceMotion ? FadeIn.duration(150) : FadeInDown.duration(380)}
          style={s.content}
        >
          {step.kind === 'welcome' && (
            <>
              <Text style={s.title} accessibilityRole="header">Tu dinero, bajo control</Text>
              <Text style={s.description}>
                Hola, soy Moni. Te muestro Smart Finance a tu medida: dime cómo te llamas y qué quieres lograr, y te enseño lo que más te sirve.
              </Text>
            </>
          )}

          {step.kind === 'name' && (
            <>
              <Text style={s.questionTitle} accessibilityRole="header">¿Cómo te llamas?</Text>
              <Text style={s.description}>Así te saludamos en Inicio. Puedes cambiarlo cuando quieras en Perfil.</Text>
              <TextInput
                style={s.input}
                value={vm.name}
                onChangeText={vm.setName}
                placeholder="Tu nombre"
                placeholderTextColor="rgba(255,255,255,0.6)"
                autoCapitalize="words"
                autoComplete="given-name"
                textContentType="givenName"
                returnKeyType="next"
                onSubmitEditing={vm.next}
                maxLength={40}
                accessibilityLabel="Tu nombre"
              />
            </>
          )}

          {step.kind === 'interests' && (
            <>
              <Text style={s.questionTitle} accessibilityRole="header">
                {who ? `${who}, ¿qué quieres lograr?` : '¿Qué quieres lograr?'}
              </Text>
              <Text style={s.description}>Elige una o varias opciones y armamos tu recorrido.</Text>
              <View style={s.interestGrid}>
                {INTERESTS.map((interest) => (
                  <InterestOption
                    key={interest.id}
                    id={interest.id}
                    label={interest.label}
                    icon={interest.icon}
                    selected={vm.interests.includes(interest.id)}
                    onToggle={vm.toggleInterest}
                    s={s}
                    c={c}
                  />
                ))}
              </View>
            </>
          )}

          {step.kind === 'feature' && <FeatureSlide feature={step.feature} position={vm.tour.indexOf(step.feature)} total={vm.tour.length} s={s} c={c} />}

          {step.kind === 'ready' && (
            <>
              <Text style={s.questionTitle} accessibilityRole="header">
                {who ? `Todo listo, ${who}` : 'Todo listo'}
              </Text>
              <Text style={s.description}>Tu plan para empezar:</Text>
              <View style={s.plan}>
                {vm.tour.slice(0, 4).map((feature, i) => (
                  <View key={feature.id} style={s.planRow} accessible accessibilityLabel={`Paso ${i + 1}: ${feature.firstStep}. ${feature.where}`}>
                    <View style={s.planNumber}>
                      <Text style={s.planNumberText}>{i + 1}</Text>
                    </View>
                    <View style={s.flex}>
                      <Text style={s.planTitle}>{feature.firstStep}</Text>
                      <Text style={s.planWhere}>{feature.where}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </Animated.View>

        <View style={s.footer}>
          <View style={s.dots} accessibilityRole="tablist">
            {steps.map((item, i) => (
              <PageDot
                key={`${item.kind}-${i}`}
                active={i === index}
                label={`Página ${i + 1} de ${steps.length}: ${stepLabel(item)}`}
                onPress={() => vm.goTo(i)}
                s={s}
                c={c}
              />
            ))}
          </View>

          <AnimatedPressable
            style={s.next}
            onPress={vm.next}
            disabled={vm.isSaving}
            onPressFeedback={hapticSave}
            accessibilityRole="button"
            accessibilityLabel={nextLabel}
          >
            <Text style={s.nextText}>{nextLabel}</Text>
            <Ionicons name="arrow-forward" size={20} color={c.onPeach} />
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FeatureSlide({ feature, position, total, s, c }: {
  feature: Feature; position: number; total: number; s: Styles; c: ThemeColors;
}) {
  return (
    <>
      <Text style={s.eyebrow}>{`Para ti · ${position + 1} de ${total}`}</Text>
      <Text style={s.title} accessibilityRole="header">{feature.title}</Text>
      <Text style={s.description}>{feature.description}</Text>
      <View style={s.where} accessible accessibilityLabel={`Lo encuentras en ${feature.where}`}>
        <Ionicons name="navigate-outline" size={16} color={c.peach} />
        <Text style={s.whereText}>{feature.where}</Text>
      </View>
    </>
  );
}

function InterestOption({ id, label, icon, selected, onToggle, s, c }: {
  id: InterestId; label: string; icon: string; selected: boolean;
  onToggle: (id: InterestId) => void; s: Styles; c: ThemeColors;
}) {
  return (
    <AnimatedPressable
      style={[s.interest, selected && s.interestSelected]}
      onPress={() => onToggle(id)}
      onPressFeedback={hapticToggle}
      pressScale={0.96}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
    >
      <Ionicons
        name={(selected ? 'checkmark-circle' : icon) as keyof typeof Ionicons.glyphMap}
        size={20}
        color={selected ? c.onPeach : c.onPrimary}
      />
      <Text style={[s.interestText, selected && s.interestTextSelected]} numberOfLines={2}>{label}</Text>
    </AnimatedPressable>
  );
}

function PageDot({ active, label, onPress, s, c }: {
  active: boolean; label: string; onPress: () => void; s: Styles; c: ThemeColors;
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
    flex: { flex: 1 },
    topBar: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    skip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    skipText: { fontFamily: fonts.semibold, fontSize: 15, color: 'rgba(255,255,255,0.8)' },
    floatArea: { height: 290, alignItems: 'center', justifyContent: 'center' },
    floatAreaCompact: { height: 150, alignItems: 'center', justifyContent: 'center' },
    content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xxl },
    eyebrow: {
      fontFamily: fonts.semibold,
      fontSize: 13,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: c.peach,
      marginBottom: spacing.sm,
    },
    title: { fontFamily: fonts.extrabold, fontSize: 38, lineHeight: 44, letterSpacing: -1, color: c.onPrimary, marginBottom: spacing.md },
    questionTitle: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6, color: c.onPrimary, marginBottom: spacing.sm },
    description: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: 'rgba(255,255,255,0.82)' },
    input: {
      marginTop: spacing.xl,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.28)',
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      fontSize: 18,
      color: c.onPrimary,
    },
    interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
    interest: {
      width: '48.5%',
      minHeight: 60,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    interestSelected: { backgroundColor: c.peach, borderColor: c.peach },
    interestText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 18, color: c.onPrimary },
    interestTextSelected: { fontFamily: fonts.semibold, color: c.onPeach },
    where: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: spacing.xs + 2,
      marginTop: spacing.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    whereText: { fontFamily: fonts.semibold, fontSize: 14, color: c.onPrimary },
    plan: { marginTop: spacing.lg, gap: spacing.md },
    planRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    planNumber: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.peach,
    },
    planNumberText: { fontFamily: fonts.bold, fontSize: 15, color: c.onPeach },
    planTitle: { fontFamily: fonts.semibold, fontSize: 16, color: c.onPrimary },
    planWhere: { fontFamily: fonts.regular, fontSize: 13, color: 'rgba(255,255,255,0.72)' },
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
