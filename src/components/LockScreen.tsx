import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from './ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, radius } from '../constants/theme';
import { authenticateWithBiometrics } from '../services/biometricAuth';
import { hasPinSet, verifyPin } from '../services/pinAuth';
import { PinPad } from './PinPad';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { haptics, hapticSave, hapticToggle } from '../utils/haptics';
import { springCelebrate, UNLOCK_HOLD_MS } from '../constants/motion';
import { Mascot } from './mascot/Mascot';
import { AnimatedPressable } from './ui/AnimatedPressable';

interface LockScreenProps {
  onUnlock: () => void;
}

type LockMode = 'faceid' | 'pin';

export function LockScreen({ onUnlock }: LockScreenProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const [mode, setMode] = useState<LockMode>('faceid');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [failedOnce, setFailedOnce] = useState(false);
  const [pinAvailable, setPinAvailable] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [pinAttempt, setPinAttempt] = useState(0); // cambia para forzar remount del PinPad
  // I3: el candado se abre y Moni celebra un instante antes de la cortina
  const [opened, setOpened] = useState(false);
  const reduceMotion = useReducedMotion();
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(unlockTimer.current), []);

  const succeed = useCallback(() => {
    haptics.success();
    setOpened(true);
    unlockTimer.current = setTimeout(onUnlock, reduceMotion ? 0 : UNLOCK_HOLD_MS);
  }, [onUnlock, reduceMotion]);

  useEffect(() => {
    hasPinSet().then(setPinAvailable);
  }, []);

  const handleUnlock = async () => {
    setIsAuthenticating(true);
    const success = await authenticateWithBiometrics();
    setIsAuthenticating(false);

    if (success) {
      succeed();
    } else {
      setFailedOnce(true);
    }
  };

  const handlePinComplete = useCallback(async (pin: string) => {
    const correct = await verifyPin(pin);
    if (correct) {
      succeed();
    } else {
      haptics.error();
      setPinError(true);
      setTimeout(() => {
        setPinError(false);
        setPinAttempt((n) => n + 1); // fuerza reinicio del teclado
      }, 500);
    }
  }, [succeed]);

  if (mode === 'pin') {
    return (
      <View style={styles.container}>
        {/* Si el PIN falla, Moni revisa con la lupa */}
        <View>
          <Mascot pose={opened ? 'celebrando' : pinError ? 'investigando' : 'protegiendo'} size={120} decorative />
          <LockBadge opened={opened} />
        </View>
        <Text style={styles.title}>Ingresa tu PIN</Text>
        <Text style={styles.subtitle}>Tu PIN de respaldo de 4 dígitos</Text>

        {pinError && (
          <Text style={styles.failedText}>PIN incorrecto. Intenta de nuevo.</Text>
        )}

        <View style={{ marginTop: spacing.lg }}>
          <PinPad key={pinAttempt} onComplete={handlePinComplete} error={pinError} />
        </View>

        <AnimatedPressable style={styles.switchLink} onPress={() => setMode('faceid')} onPressFeedback={hapticToggle}>
          <Text style={styles.switchLinkText}>Usar Face ID en su lugar</Text>
        </AnimatedPressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View>
        <Mascot pose={opened ? 'celebrando' : 'protegiendo'} size={170} interactive />
        <LockBadge opened={opened} />
      </View>

      <Text style={styles.title}>Smart Finance</Text>
      <Text style={styles.subtitle}>
        Tu información financiera está protegida
      </Text>

      {failedOnce && (
        <Text style={styles.failedText}>
          No se pudo verificar tu identidad. Intenta de nuevo.
        </Text>
      )}

      <AnimatedPressable
        style={styles.unlockButton}
        onPress={handleUnlock}
        onPressFeedback={isAuthenticating ? undefined : hapticSave}
        disabled={isAuthenticating}
      >
        {isAuthenticating ? (
          <ActivityIndicator size="small" color={c.onAccent} />
        ) : (
          <>
            <Ionicons name="scan-outline" size={20} color={c.onAccent} />
            <Text style={styles.unlockText}>Desbloquear</Text>
          </>
        )}
      </AnimatedPressable>

      {pinAvailable && (
        <AnimatedPressable style={styles.switchLink} onPress={() => setMode('pin')} onPressFeedback={hapticToggle}>
          <Text style={styles.switchLinkText}>¿Falló Face ID? Usar PIN</Text>
        </AnimatedPressable>
      )}
    </View>
  );
}

/** Candado que se abre con un pequeño salto al desbloquear (I3). */
function LockBadge({ opened }: { opened: boolean }) {
  const c = useColors();
  const pop = useSharedValue(1);
  const tilt = useSharedValue(0);
  useEffect(() => {
    if (!opened) return;
    pop.value = withSequence(withTiming(1.25, { duration: 120 }), withSpring(1, springCelebrate));
    tilt.value = withSpring(-14, springCelebrate);
  }, [opened, pop, tilt]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }, { rotate: `${tilt.value}deg` }],
  }));
  return (
    <Animated.View
      accessible
      accessibilityLabel={opened ? 'Desbloqueado' : 'Bloqueado'}
      accessibilityLiveRegion="polite"
      style={[
        {
          position: 'absolute',
          right: 0,
          bottom: 8,
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: opened ? c.income : c.accent,
        },
        style,
      ]}
    >
      <Ionicons name={opened ? 'lock-open' : 'lock-closed'} size={20} color={c.onAccent} />
    </Animated.View>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: c.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: c.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  failedText: {
    fontSize: 13,
    color: c.expense,
    marginBottom: spacing.md,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: c.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minWidth: 180,
  },
  unlockText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  switchLink: { marginTop: spacing.xl, padding: spacing.sm },
  switchLinkText: { fontSize: 13, color: c.blue, fontWeight: '500' },
});
