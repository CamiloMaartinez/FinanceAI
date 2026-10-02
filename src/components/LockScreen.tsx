import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, radius } from '../constants/theme';
import { authenticateWithBiometrics } from '../services/biometricAuth';
import { hasPinSet, verifyPin } from '../services/pinAuth';
import { PinPad } from './PinPad';
import { hapticDelete, hapticSuccess, hapticSave, hapticToggle } from '../utils/haptics';
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

  useEffect(() => {
    hasPinSet().then(setPinAvailable);
  }, []);

  const handleUnlock = async () => {
    setIsAuthenticating(true);
    const success = await authenticateWithBiometrics();
    setIsAuthenticating(false);

    if (success) {
      onUnlock();
    } else {
      setFailedOnce(true);
    }
  };

  const handlePinComplete = useCallback(async (pin: string) => {
    const correct = await verifyPin(pin);
    if (correct) {
      hapticSuccess();
      onUnlock();
    } else {
      hapticDelete();
      setPinError(true);
      setTimeout(() => {
        setPinError(false);
        setPinAttempt((n) => n + 1); // fuerza reinicio del teclado
      }, 500);
    }
  }, [onUnlock]);

  if (mode === 'pin') {
    return (
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="keypad" size={32} color={c.blue} />
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
      <View style={styles.iconCircle}>
        <Ionicons name="lock-closed" size={36} color={c.blue} />
      </View>

      <Text style={styles.title}>FinanceAI</Text>
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
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="scan-outline" size={20} color="#fff" />
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
    backgroundColor: c.blue,
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
