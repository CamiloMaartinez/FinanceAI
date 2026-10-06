import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text } from './ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing } from '../constants/theme';
import { hasPinSet, setPin, removePin } from '../services/pinAuth';
import { hapticSuccess, hapticDelete } from '../utils/haptics';
import { PinPad } from './PinPad';
import { Sheet } from './ui/Sheet';
import { Button } from './ui/Button';
import { AnimatedPressable } from './ui/AnimatedPressable';

interface PinSetupModalProps {
  visible: boolean;
  onClose: () => void;
}

type Step = 'menu' | 'create' | 'confirm';

export function PinSetupModal({ visible, onClose }: PinSetupModalProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const [hasPin, setHasPin] = useState(false);
  const [step, setStep] = useState<Step>('menu');
  const [tempPin, setTempPin] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (visible) {
      hasPinSet().then(setHasPin);
      setStep('menu');
      setError('');
    }
  }, [visible]);

  const handleCreateComplete = (pin: string) => {
    setTempPin(pin);
    setStep('confirm');
    setAttempt((n) => n + 1);
  };

  const handleConfirmComplete = async (pin: string) => {
    if (pin === tempPin) {
      await setPin(pin);
      hapticSuccess();
      setHasPin(true);
      setStep('menu');
      setError('');
    } else {
      hapticDelete();
      setError('Los PIN no coinciden. Intenta de nuevo.');
      setStep('create');
      setAttempt((n) => n + 1);
    }
  };

  const handleRemove = () => {
    Alert.alert(
      'Eliminar PIN',
      'Sin PIN de respaldo, si Face ID falla no tendrás otra forma de entrar salvo el código de tu teléfono. ¿Eliminar de todos modos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive', onPress: async () => {
            await removePin();
            setHasPin(false);
          },
        },
      ]
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>PIN de respaldo</Text>
          <AnimatedPressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={c.textTertiary} />
          </AnimatedPressable>
        </View>

        {step === 'menu' && (
          <>
            <Text style={styles.subtitle}>
              {hasPin
                ? 'Ya tienes un PIN configurado. Se usa como respaldo si Face ID falla.'
                : 'Configura un PIN de 4 dígitos para entrar a la app si Face ID falla o no está disponible.'}
            </Text>
            <Button label={hasPin ? 'Cambiar PIN' : 'Crear PIN'} variant="primary" onPress={() => setStep('create')} />
            {hasPin && (
              <AnimatedPressable style={styles.dangerBtn} onPress={handleRemove} onPressFeedback={hapticDelete}>
                <Text style={styles.dangerBtnText}>Eliminar PIN</Text>
              </AnimatedPressable>
            )}
          </>
        )}

        {step === 'create' && (
          <>
            <Text style={styles.subtitle}>Crea tu nuevo PIN de 4 dígitos</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.padWrapper}>
              <PinPad key={attempt} onComplete={handleCreateComplete} />
            </View>
          </>
        )}

        {step === 'confirm' && (
          <>
            <Text style={styles.subtitle}>Confirma tu PIN</Text>
            <View style={styles.padWrapper}>
              <PinPad key={`confirm-${attempt}`} onComplete={handleConfirmComplete} />
            </View>
          </>
        )}
      </View>
    </Sheet>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  content: {
    padding: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
  subtitle: { fontSize: 13, color: c.textTertiary, lineHeight: 18 },
  errorText: { fontSize: 12.5, color: c.expense },
  dangerBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  dangerBtnText: { color: c.expense, fontSize: 13, fontWeight: '500' },
  padWrapper: { alignItems: 'center', paddingVertical: spacing.md },
});
