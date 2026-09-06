import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useColors, spacing, radius } from '../constants/theme';
import { markOnboardingSeen } from '../services/onboarding';

interface OnboardingProps {
  profileId: string;
  onFinish: () => void;
}

const SLIDES = [
  {
    icon: 'sparkles' as const,
    color: '#007AFF',
    title: 'Bienvenido a FinanceAI',
    description: 'Tu dinero, bajo control, con una IA de tu lado. Vamos a mostrarte lo que puedes hacer en menos de un minuto.',
  },
  {
    icon: 'wallet' as const,
    color: '#34C759',
    title: 'Organiza tus finanzas',
    description: 'Registra cuentas, transacciones y define un presupuesto mensual — total y por categoría — con alertas cuando te acerques al límite.',
  },
  {
    icon: 'flag' as const,
    color: '#FF9500',
    title: 'Alcanza tus metas',
    description: 'Crea metas de ahorro, controla tus suscripciones recurrentes, y compara tarjetas y opciones de inversión, todo en un solo lugar.',
  },
  {
    icon: 'chatbubbles' as const,
    color: '#AF52DE',
    title: 'Un asistente con IA',
    description: 'Pregúntale sobre tus finanzas, evalúa si puedes comprar algo, y recibe un resumen semanal automático cada lunes.',
  },
];

export function Onboarding({ profileId, onFinish }: OnboardingProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setIndex((i) => i + 1);
    }
  };

  const handleFinish = async () => {
    await markOnboardingSeen(profileId);
    onFinish();
  };

  return (
    <SafeAreaView style={styles.container}>
      {!isLast && (
        <TouchableOpacity style={styles.skipButton} onPress={handleFinish} hitSlop={8}>
          <Text style={styles.skipText}>Saltar</Text>
        </TouchableOpacity>
      )}

      <Animated.View key={index} entering={FadeIn.duration(300)} style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: slide.color + '20' }]}>
          <Ionicons name={slide.icon} size={44} color={slide.color} />
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => setIndex(i)} hitSlop={8}>
              <View style={[styles.dot, i === index && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>{isLast ? 'Comenzar' : 'Siguiente'}</Text>
          {!isLast && <Ionicons name="arrow-forward" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  skipButton: {
    alignSelf: 'flex-end',
    padding: spacing.lg,
  },
  skipText: { fontSize: 14, color: c.textTertiary },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: c.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 15,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.borderStrong,
  },
  dotActive: {
    width: 22,
    backgroundColor: c.blue,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: c.blue,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
