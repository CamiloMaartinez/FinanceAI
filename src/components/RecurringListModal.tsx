import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, radius } from '../constants/theme';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { hapticToggle } from '../utils/haptics';
import { formatCurrency } from '../utils/currency';
import { RECURRENCE_LABELS } from '../utils/recurrence';
import { getAllRecurring, deleteRecurring } from '../database/db';
import type { RecurringTransaction } from '../models/types';

interface RecurringListModalProps {
  visible: boolean;
  onClose: () => void;
}

// Lista de movimientos recurrentes activos, con opción de detenerlos.
// Detener una regla no borra los movimientos que ya generó.
export function RecurringListModal({ visible, onClose }: RecurringListModalProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const [rules, setRules] = useState<RecurringTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setRules(await getAllRecurring());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const confirmStop = (rule: RecurringTransaction) => {
    Alert.alert(
      'Detener recurrente',
      `"${rule.notes || rule.categoryName || 'Movimiento'}" dejará de registrarse solo. Los movimientos que ya se crearon se mantienen.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Detener',
          style: 'destructive',
          onPress: async () => {
            await deleteRecurring(rule.id);
            await load();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerSide} />
          <Text style={styles.headerTitle}>Recurrentes</Text>
          <AnimatedPressable style={styles.headerSide} onPress={onClose}>
            <Text style={styles.closeBtn}>Cerrar</Text>
          </AnimatedPressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {isLoading ? (
            <ActivityIndicator color={c.textTertiary} style={{ marginTop: spacing.xl }} />
          ) : rules.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="repeat" size={32} color={c.textTertiary} />
              <Text style={styles.emptyTitle}>No tienes movimientos recurrentes</Text>
              <Text style={styles.emptyText}>
                Al crear un ingreso o gasto, elige "Repetir" para que se registre solo,
                como tu salario o el arriendo.
              </Text>
            </View>
          ) : (
            rules.map((rule) => {
              const isIncome = rule.type === 'income';
              return (
                <View key={rule.id} style={styles.row}>
                  <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={1}>
                      {rule.notes || rule.categoryName || (isIncome ? 'Ingreso' : 'Gasto')}
                    </Text>
                    <Text style={styles.meta}>
                      {RECURRENCE_LABELS[rule.frequency]} · {rule.accountName ?? 'Cuenta'} · próximo{' '}
                      {new Date(rule.nextDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                  <Text style={[styles.amount, { color: isIncome ? c.income : c.expense }]}>
                    {isIncome ? '+' : '-'}{formatCurrency(rule.amount)}
                  </Text>
                  <AnimatedPressable
                    onPress={() => confirmStop(rule)}
                    onPressFeedback={hapticToggle}
                    hitSlop={8}
                    accessibilityLabel="Detener recurrente"
                  >
                    <Ionicons name="stop-circle-outline" size={22} color={c.textTertiary} />
                  </AnimatedPressable>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
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
  headerSide: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: c.textPrimary,
  },
  closeBtn: {
    fontSize: 16,
    fontWeight: '600',
    color: c.accent,
  },
  content: {
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textPrimary,
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    color: c.textTertiary,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
});
