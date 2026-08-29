import React, { useState, useEffect, useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, radius } from '../constants/theme';
import type { Category } from '../models/types';

interface BudgetFormProps {
  visible: boolean;
  categories: Category[];
  initialTotalLimit: number;
  initialCategoryLimits: Record<string, number>;
  onClose: () => void;
  onSave: (totalLimit: number, categoryLimits: Record<string, number>) => void;
}

// Convierte "150.000" -> 150000
function parseAmount(text: string): number {
  const cleaned = text.replace(/\./g, '').replace(',', '.');
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

export function BudgetForm({
  visible,
  categories,
  initialTotalLimit,
  initialCategoryLimits,
  onClose,
  onSave,
}: BudgetFormProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);

  const [totalLimit, setTotalLimit] = useState('');
  const [categoryInputs, setCategoryInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  // Precarga los valores cada vez que se abre el modal
  useEffect(() => {
    if (visible) {
      setTotalLimit(initialTotalLimit > 0 ? String(Math.round(initialTotalLimit)) : '');
      const inputs: Record<string, string> = {};
      for (const [catId, amount] of Object.entries(initialCategoryLimits)) {
        if (amount > 0) inputs[catId] = String(Math.round(amount));
      }
      setCategoryInputs(inputs);
      setError('');
    }
  }, [visible, initialTotalLimit, initialCategoryLimits]);

  const categorySum = Object.values(categoryInputs).reduce(
    (sum, val) => sum + parseAmount(val),
    0
  );

  const handleSave = () => {
    const total = parseAmount(totalLimit);
    if (total <= 0) {
      setError('Ingresa un límite mensual válido');
      return;
    }

    const categoryLimits: Record<string, number> = {};
    for (const [catId, val] of Object.entries(categoryInputs)) {
      const amount = parseAmount(val);
      if (amount > 0) categoryLimits[catId] = amount;
    }

    onSave(total, categoryLimits);
  };

  const setCategoryValue = (categoryId: string, value: string) => {
    setCategoryInputs((prev) => ({ ...prev, [categoryId]: value }));
    setError('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelBtn}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Presupuesto del mes</Text>
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

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Límite total del mes</Text>
            <View style={styles.totalInputRow}>
              <Text style={styles.totalPrefix}>$</Text>
              <TextInput
                style={styles.totalInput}
                placeholder="0"
                placeholderTextColor={c.textTertiary}
                value={totalLimit}
                onChangeText={(t) => { setTotalLimit(t); setError(''); }}
                keyboardType="numeric"
                autoFocus
              />
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.categoryHeaderRow}>
              <Text style={styles.fieldLabel}>Límites por categoría (opcional)</Text>
            </View>
            {categorySum > 0 && (
              <Text style={styles.categorySumText}>
                Asignado: ${categorySum.toLocaleString('es-CO')}
              </Text>
            )}
            <Text style={styles.fieldHint}>
              Déjalas en blanco si no quieres controlar esa categoría específicamente.
            </Text>

            {categories.map((cat) => (
              <View key={cat.id} style={styles.categoryRow}>
                <View style={[styles.categoryIcon, { backgroundColor: cat.colorHex + '20' }]}>
                  <Ionicons name={cat.iconName as any} size={16} color={cat.colorHex} />
                </View>
                <Text style={styles.categoryName} numberOfLines={1}>{cat.name}</Text>
                <View style={styles.categoryInputWrap}>
                  <Text style={styles.categoryInputPrefix}>$</Text>
                  <TextInput
                    style={styles.categoryInput}
                    placeholder="0"
                    placeholderTextColor={c.textTertiary}
                    value={categoryInputs[cat.id] ?? ''}
                    onChangeText={(t) => setCategoryValue(cat.id, t)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: c.textPrimary,
  },
  cancelBtn: {
    fontSize: 16,
    color: c.textSecondary,
  },
  saveBtn: {
    fontSize: 16,
    fontWeight: '600',
    color: c.blue,
  },
  form: {
    padding: spacing.lg,
  },
  errorBox: {
    backgroundColor: 'rgba(255,59,48,0.15)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 13,
    color: c.expense,
  },
  field: {
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldHint: {
    fontSize: 12,
    color: c.textTertiary,
    marginBottom: spacing.md,
  },
  totalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  totalPrefix: {
    fontSize: 24,
    fontWeight: '200',
    color: c.textTertiary,
    marginRight: spacing.xs,
  },
  totalInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '200',
    color: c.textPrimary,
    paddingVertical: spacing.lg,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categorySumText: {
    fontSize: 12,
    fontWeight: '500',
    color: c.textSecondary,
    marginBottom: spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    color: c.textPrimary,
  },
  categoryInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    minWidth: 110,
  },
  categoryInputPrefix: {
    fontSize: 14,
    color: c.textTertiary,
    marginRight: 2,
  },
  categoryInput: {
    flex: 1,
    fontSize: 14,
    color: c.textPrimary,
    paddingVertical: spacing.sm,
    textAlign: 'right',
  },
});
