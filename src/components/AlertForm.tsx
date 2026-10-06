import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from './ui/Text';
import { TextInput } from './ui/TextInput';
import Animated, { useAnimatedStyle, useSharedValue, interpolateColor, withSpring } from 'react-native-reanimated';
import { useColors, spacing, typography, radius } from '../constants/theme';
import { springDefault } from '../constants/motion';
import type { AlertType } from '../hooks/useAlerts';
import { ALERT_TYPE_LABELS, ALERT_TYPE_UNITS } from '../hooks/useAlerts';
import type { Category } from '../models/types';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { hapticSave, hapticToggle } from '../utils/haptics';

interface AlertFormProps {
  visible: boolean;
  categories: Category[];
  onClose: () => void;
  onSave: (
    title: string,
    type: AlertType,
    condition: string,
    threshold: number,
    categoryId: string | null
  ) => void;
}

const ALERT_TYPES: { value: AlertType; description: string }[] = [
  {
    value: 'balance_below',
    description: 'Cuando tu saldo total baja de un monto',
  },
  {
    value: 'monthly_expense_above',
    description: 'Cuando tus gastos del mes superan un monto',
  },
  {
    value: 'category_expense_above',
    description: 'Cuando el gasto en una categoría supera un monto',
  },
  {
    value: 'goal_progress',
    description: 'Cuando una meta alcanza cierto porcentaje',
  },
  {
    value: 'savings_rate_below',
    description: 'Cuando tu tasa de ahorro baja de un porcentaje',
  },
];

// Anillo de foco animado (§4/§15 apple-design).
function useFocusRing(c: ReturnType<typeof useColors>) {
  const focus = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], ['transparent', c.income]),
  }));
  return {
    style,
    onFocus: () => { focus.value = withSpring(1, springDefault); },
    onBlur: () => { focus.value = withSpring(0, springDefault); },
  };
}

export function AlertForm({ visible, categories, onClose, onSave }: AlertFormProps) {
  const [type,       setType]       = useState<AlertType>('balance_below');
  const [threshold,  setThreshold]  = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [error,      setError]      = useState('');
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const thresholdRing = useFocusRing(c);

  const unit       = ALERT_TYPE_UNITS[type];
  const needsCategory = type === 'category_expense_above';

  const handleSave = () => {
    const num = parseFloat(threshold.replace(/\./g, '').replace(',', '.'));
    if (isNaN(num) || num <= 0) {
      setError('Ingresa un valor válido');
      return;
    }
    if (needsCategory && !categoryId) {
      setError('Selecciona una categoría');
      return;
    }

    const title = ALERT_TYPE_LABELS[type];
    onSave(title, type, 'greater_than', num, categoryId);
    handleClose();
  };

  const handleClose = () => {
    setType('balance_below');
    setThreshold('');
    setCategoryId(null);
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <AnimatedPressable onPress={handleClose}>
            <Text style={styles.cancelBtn}>Cancelar</Text>
          </AnimatedPressable>
          <Text style={styles.headerTitle}>NUEVA ALERTA</Text>
          <AnimatedPressable onPress={handleSave} onPressFeedback={hapticSave}>
            <Text style={styles.saveBtn}>Guardar</Text>
          </AnimatedPressable>
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Tipo de alerta */}
          <Text style={styles.fieldLabel}>TIPO DE ALERTA</Text>
          {ALERT_TYPES.map((t) => (
            <AnimatedPressable
              key={t.value}
              pressScale={0.99}
              style={[
                styles.typeOption,
                type === t.value && styles.typeOptionSelected,
              ]}
              onPress={() => { setType(t.value); setCategoryId(null); setError(''); }}
              onPressFeedback={hapticToggle}
            >
              <View style={styles.typeLeft}>
                <Text style={[
                  styles.typeTitle,
                  type === t.value && { color: c.income },
                ]}>
                  {ALERT_TYPE_LABELS[t.value]}
                </Text>
                <Text style={styles.typeDesc}>{t.description}</Text>
              </View>
              {type === t.value && (
                <View style={styles.selectedDot} />
              )}
            </AnimatedPressable>
          ))}

          {/* Valor umbral */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.xl }]}>
            {unit === '%' ? 'PORCENTAJE' : 'MONTO'}
          </Text>
          <Animated.View style={[styles.thresholdRow, thresholdRing.style]}>
            <Text style={styles.thresholdPrefix}>{unit}</Text>
            <TextInput
              style={styles.thresholdInput}
              placeholder="0"
              placeholderTextColor={c.textTertiary}
              value={threshold}
              onChangeText={(t) => { setThreshold(t); setError(''); }}
              onFocus={thresholdRing.onFocus}
              onBlur={thresholdRing.onBlur}
              keyboardType="numeric"
              autoFocus
            />
          </Animated.View>
          <View style={styles.thresholdDivider} />

          {/* Selector de categoría */}
          {needsCategory && (
            <>
              <Text style={[styles.fieldLabel, { marginTop: spacing.xl }]}>
                CATEGORÍA
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryRow}>
                  {categories.map((cat) => (
                    <AnimatedPressable
                      key={cat.id}
                      pressScale={0.97}
                      style={[
                        styles.categoryChip,
                        categoryId === cat.id && {
                          borderColor: cat.colorHex,
                          backgroundColor: cat.colorHex + '15',
                        },
                      ]}
                      onPress={() => { setCategoryId(cat.id); setError(''); }}
                      onPressFeedback={hapticToggle}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        categoryId === cat.id && { color: cat.colorHex },
                      ]}>
                        {cat.name}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: c.borderStrong,
  },
  headerTitle: { ...typography.label, color: c.textPrimary },
  cancelBtn: { fontSize: 15, fontWeight: '300', color: c.textSecondary },
  saveBtn: { fontSize: 15, fontWeight: '400', color: c.income },
  form: { padding: spacing.xl },
  errorBox: {
    backgroundColor: c.expense + '1A',
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: { fontSize: 13, fontWeight: '300', color: c.expense },
  fieldLabel: { ...typography.label, color: c.textTertiary, marginBottom: spacing.md },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
  },
  typeOptionSelected: {},
  typeLeft: { flex: 1 },
  typeTitle: { fontSize: 14, fontWeight: '300', color: c.textPrimary, marginBottom: 2 },
  typeDesc: { fontSize: 11, fontWeight: '300', color: c.textTertiary },
  selectedDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: c.income,
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: radius.sm,
  },
  thresholdPrefix: {
    fontSize: 28,
    fontWeight: '200',
    color: c.textTertiary,
  },
  thresholdInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '200',
    color: c.textPrimary,
    letterSpacing: -1,
  },
  thresholdDivider: {
    height: 0.5,
    backgroundColor: c.borderStrong,
    marginTop: spacing.sm,
  },
  categoryRow: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.sm },
  categoryChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 0.5,
    borderColor: c.borderStrong,
  },
  categoryChipText: { fontSize: 13, fontWeight: '300', color: c.textSecondary },
});
