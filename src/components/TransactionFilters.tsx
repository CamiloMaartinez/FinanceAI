import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, radius } from '../constants/theme';
import type { Account, Category } from '../models/types';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { Button } from './ui/Button';
import { hapticToggle } from '../utils/haptics';

export type DateRangeFilter = 'all' | '7d' | '30d' | 'month';

export interface TransactionFiltersState {
  categoryIds: string[];
  accountIds: string[];
  dateRange: DateRangeFilter;
  typeFilter: 'all' | 'income' | 'expense';
}

export const EMPTY_FILTERS: TransactionFiltersState = {
  categoryIds: [],
  accountIds: [],
  dateRange: 'all',
  typeFilter: 'all',
};

export function countActiveFilters(f: TransactionFiltersState): number {
  let count = 0;
  if (f.categoryIds.length > 0) count++;
  if (f.accountIds.length > 0) count++;
  if (f.dateRange !== 'all') count++;
  if (f.typeFilter !== 'all') count++;
  return count;
}

const DATE_RANGES: { value: DateRangeFilter; label: string }[] = [
  { value: 'all',   label: 'Todo' },
  { value: '7d',    label: 'Últimos 7 días' },
  { value: '30d',   label: 'Últimos 30 días' },
  { value: 'month', label: 'Este mes' },
];

const TYPE_OPTIONS: { value: 'all' | 'income' | 'expense'; label: string }[] = [
  { value: 'all',     label: 'Todos' },
  { value: 'income',  label: 'Ingresos' },
  { value: 'expense', label: 'Gastos' },
];

interface TransactionFiltersProps {
  visible: boolean;
  categories: Category[];
  accounts: Account[];
  filters: TransactionFiltersState;
  onClose: () => void;
  onApply: (filters: TransactionFiltersState) => void;
}

export function TransactionFilters({
  visible,
  categories,
  accounts,
  filters,
  onClose,
  onApply,
}: TransactionFiltersProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const [draft, setDraft] = React.useState<TransactionFiltersState>(filters);

  React.useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const toggleCategory = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter((c) => c !== id)
        : [...prev.categoryIds, id],
    }));
  };

  const toggleAccount = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      accountIds: prev.accountIds.includes(id)
        ? prev.accountIds.filter((a) => a !== id)
        : [...prev.accountIds, id],
    }));
  };

  const handleClear = () => {
    setDraft(EMPTY_FILTERS);
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <AnimatedPressable onPress={onClose} onPressFeedback={hapticToggle}>
            <Text style={styles.cancelBtn}>Cancelar</Text>
          </AnimatedPressable>
          <Text style={styles.headerTitle}>Filtros</Text>
          <AnimatedPressable onPress={handleClear} onPressFeedback={hapticToggle}>
            <Text style={styles.clearBtn}>Limpiar</Text>
          </AnimatedPressable>
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Tipo</Text>
            <View style={styles.chipRow}>
              {TYPE_OPTIONS.map((opt) => {
                const selected = draft.typeFilter === opt.value;
                return (
                  <AnimatedPressable
                    key={opt.value}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setDraft((prev) => ({ ...prev, typeFilter: opt.value }))}
                    onPressFeedback={hapticToggle}
                  >
                    <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                      {opt.label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Fecha</Text>
            <View style={styles.chipRow}>
              {DATE_RANGES.map((opt) => {
                const selected = draft.dateRange === opt.value;
                return (
                  <AnimatedPressable
                    key={opt.value}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setDraft((prev) => ({ ...prev, dateRange: opt.value }))}
                    onPressFeedback={hapticToggle}
                  >
                    <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                      {opt.label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          {accounts.length > 0 && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Cuentas</Text>
              <View style={styles.chipRow}>
                {accounts.map((acc) => {
                  const selected = draft.accountIds.includes(acc.id);
                  return (
                    <AnimatedPressable
                      key={acc.id}
                      style={[styles.chip, selected && { backgroundColor: acc.colorHex + '25', borderColor: acc.colorHex }]}
                      onPress={() => toggleAccount(acc.id)}
                      onPressFeedback={hapticToggle}
                    >
                      <Text style={[styles.chipLabel, selected && { color: acc.colorHex, fontWeight: '600' }]}>
                        {acc.name}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
          )}

          {categories.length > 0 && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Categorías</Text>
              <View style={styles.chipRow}>
                {categories.map((cat) => {
                  const selected = draft.categoryIds.includes(cat.id);
                  return (
                    <AnimatedPressable
                      key={cat.id}
                      style={[styles.chip, selected && { backgroundColor: cat.colorHex + '25', borderColor: cat.colorHex }]}
                      onPress={() => toggleCategory(cat.id)}
                      onPressFeedback={hapticToggle}
                    >
                      <Ionicons
                        name={cat.iconName as any}
                        size={13}
                        color={selected ? cat.colorHex : c.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.chipLabel, selected && { color: cat.colorHex, fontWeight: '600' }]}>
                        {cat.name}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button label="Aplicar filtros" variant="primary" onPress={handleApply} />
        </View>
      </SafeAreaView>
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
    borderBottomColor: c.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: c.textPrimary },
  cancelBtn: { fontSize: 16, color: c.textSecondary },
  clearBtn: { fontSize: 15, color: c.expense },
  form: { padding: spacing.lg },
  field: { marginBottom: spacing.xl },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipSelected: {
    borderColor: c.accent,
    backgroundColor: c.accent + '1A',
  },
  chipLabel: { fontSize: 13, color: c.textSecondary },
  chipLabelSelected: { color: c.accent, fontWeight: '600' },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 0.5,
    borderTopColor: c.border,
  },
});
