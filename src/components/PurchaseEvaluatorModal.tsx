import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, radius } from '../constants/theme';
import { Sheet } from './ui/Sheet';
import { Button } from './ui/Button';

interface PurchaseEvaluatorModalProps {
  visible: boolean;
  onClose: () => void;
  onEvaluate: (itemDescription: string, price: number) => void;
}

export function PurchaseEvaluatorModal({ visible, onClose, onEvaluate }: PurchaseEvaluatorModalProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');

  const handleClose = () => {
    setDescription('');
    setPrice('');
    setError('');
    onClose();
  };

  const handleEvaluate = () => {
    const amount = parseFloat(price.replace(/\./g, '').replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      setError('Ingresa un precio válido');
      return;
    }
    onEvaluate(description.trim(), amount);
    handleClose();
  };

  return (
    <Sheet visible={visible} onClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="calculator-outline" size={22} color={c.accent} />
        </View>
        <Text style={styles.title}>¿Puedo comprarlo?</Text>
        <Text style={styles.subtitle}>
          La IA revisará tu saldo, gastos y metas antes de darte una recomendación
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>¿Qué quieres comprar? (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Tenis nuevos, un iPad..."
            placeholderTextColor={c.textTertiary}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Precio</Text>
          <View style={styles.priceRow}>
            <Text style={styles.pricePrefix}>$</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="0"
              placeholderTextColor={c.textTertiary}
              value={price}
              onChangeText={(t) => { setPrice(t); setError(''); }}
              keyboardType="numeric"
              autoFocus
            />
          </View>
        </View>

        <View style={styles.buttonsRow}>
          <Button label="Cancelar" variant="secondary" onPress={handleClose} haptic={null} style={styles.flexBtn} />
          <Button label="Evaluar" variant="primary" onPress={handleEvaluate} style={styles.flexBtn} />
        </View>
      </KeyboardAvoidingView>
    </Sheet>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  content: {
    padding: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: c.accent + '20',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  title: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
  subtitle: { fontSize: 12.5, color: c.textTertiary, lineHeight: 17, marginBottom: spacing.sm },
  errorText: { fontSize: 12.5, color: c.expense, marginBottom: -spacing.xs },
  field: { gap: spacing.xs },
  fieldLabel: {
    fontSize: 11.5, fontWeight: '500', color: c.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  input: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: c.textPrimary,
  },
  priceRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  pricePrefix: { fontSize: 20, fontWeight: '200', color: c.textTertiary, marginRight: 4 },
  priceInput: { flex: 1, fontSize: 20, fontWeight: '200', color: c.textPrimary, paddingVertical: spacing.md },
  buttonsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  flexBtn: { flex: 1 },
});
