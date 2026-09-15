import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, radius } from '../constants/theme';
import { hasPinSet, setPin, removePin } from '../services/pinAuth';
import { hapticSuccess, hapticDelete } from '../utils/haptics';
import { PinPad } from './PinPad';

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
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>PIN de respaldo</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={c.textTertiary} />
            </TouchableOpacity>
          </View>

          {step === 'menu' && (
            <>
              <Text style={styles.subtitle}>
                {hasPin
                  ? 'Ya tienes un PIN configurado. Se usa como respaldo si Face ID falla.'
                  : 'Configura un PIN de 4 dígitos para entrar a la app si Face ID falla o no está disponible.'}
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('create')}>
                <Text style={styles.primaryBtnText}>{hasPin ? 'Cambiar PIN' : 'Crear PIN'}</Text>
              </TouchableOpacity>
              {hasPin && (
                <TouchableOpacity style={styles.dangerBtn} onPress={handleRemove}>
                  <Text style={styles.dangerBtnText}>Eliminar PIN</Text>
                </TouchableOpacity>
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
      </View>
    </Modal>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalBox: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 0.5,
    borderColor: c.borderStrong,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
  subtitle: { fontSize: 13, color: c.textTertiary, lineHeight: 18 },
  errorText: { fontSize: 12.5, color: c.expense },
  primaryBtn: {
    backgroundColor: c.blue, borderRadius: radius.md,
    paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm,
  },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  dangerBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  dangerBtnText: { color: c.expense, fontSize: 13, fontWeight: '500' },
  padWrapper: { alignItems: 'center', paddingVertical: spacing.md },
});
