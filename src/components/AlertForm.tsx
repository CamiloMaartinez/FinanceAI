import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useColors, spacing, typography, radius } from '../constants/theme';
import type { AlertType } from '../hooks/useAlerts';
import { ALERT_TYPE_LABELS, ALERT_TYPE_UNITS } from '../hooks/useAlerts';
import type { Category } from '../models/types';

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

export function AlertForm({ visible, categories, onClose, onSave }: AlertFormProps) {
  const [type,       setType]       = useState<AlertType>('balance_below');
  const [threshold,  setThreshold]  = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [error,      setError]      = useState('');
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);

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
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelBtn}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>NUEVA ALERTA</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveBtn}>Guardar</Text>
          </TouchableOpacity>
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
            <TouchableOpacity
              key={t.value}
              style={[
                styles.typeOption,
                type === t.value && styles.typeOptionSelected,
              ]}
              onPress={() => { setType(t.value); setCategoryId(null); setError(''); }}
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
            </TouchableOpacity>
          ))}

          {/* Valor umbral */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.xl }]}>
            {unit === '%' ? 'PORCENTAJE' : 'MONTO'}
          </Text>
          <View style={styles.thresholdRow}>
            <Text style={styles.thresholdPrefix}>{unit}</Text>
            <TextInput
              style={styles.thresholdInput}
              placeholder="0"
              placeholderTextColor={c.textTertiary}
              value={threshold}
              onChangeText={(t) => { setThreshold(t); setError(''); }}
              keyboardType="numeric"
              autoFocus
            />
          </View>
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
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        categoryId === cat.id && {
                          borderColor: cat.colorHex,
                          backgroundColor: cat.colorHex + '15',
                        },
                      ]}
                      onPress={() => { setCategoryId(cat.id); setError(''); }}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        categoryId === cat.id && { color: cat.colorHex },
                      ]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
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
    backgroundColor: 'rgba(229,90,78,0.1)',
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