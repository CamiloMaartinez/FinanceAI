import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing } from '../constants/theme';
import { formatCurrency } from '../utils/currency';
import { AnimatedPressable } from './ui/AnimatedPressable';
import type { TransactionWithCategory } from '../models/types';

interface TransactionRowProps {
  transaction: TransactionWithCategory;
  onPress?: (tx: TransactionWithCategory) => void;
  onLongPress?: (tx: TransactionWithCategory) => void;
}

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  income:     'arrow-down-circle',
  expense:    'arrow-up-circle',
  transfer:   'swap-horizontal',
  investment: 'pie-chart',
  loan:       'business',
  payment:    'checkmark-circle',
  debt_in:    'person-outline',
  debt_out:   'person-outline',
};

const getTypeColors = (c: ReturnType<typeof useColors>): Record<string, string> => ({
  income:     c.income,
  expense:    c.expense,
  transfer:   c.blue,
  investment: c.purple,
  loan:       c.orange,
  payment:    c.pink,
  debt_in:    c.orange,
  debt_out:   c.orange,
});

export function TransactionRow({ transaction, onPress, onLongPress }: TransactionRowProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const icon     = transaction.categoryIcon
    ? (transaction.categoryIcon as keyof typeof Ionicons.glyphMap)
    : (TYPE_ICONS[transaction.type] ?? 'ellipse');
  const color    = transaction.categoryColor ?? getTypeColors(c)[transaction.type] ?? c.textSecondary;
  const isIncome = transaction.type === 'income' || transaction.type === 'loan' || transaction.type === 'debt_in';
  // Las transferencias no son ingreso ni gasto: sin signo y en color neutro
  const isTransfer = transaction.type === 'transfer';
  // Préstamos y abonos de deudas: mueven el saldo (llevan signo) pero no son
  // ingreso ni gasto, así que van en color neutro
  const isDebt = transaction.type === 'debt_in' || transaction.type === 'debt_out';

  return (
    <AnimatedPressable
      style={styles.row}
      onPress={onPress ? () => onPress(transaction) : undefined}
      onLongPress={onLongPress ? () => onLongPress(transaction) : undefined}
    >
      <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.notes} numberOfLines={1}>
            {transaction.notes || transaction.categoryName || (isTransfer ? 'Transferencia' : 'Movimiento')}
          </Text>
          {transaction.receiptUri ? (
            <Ionicons name="attach" size={14} color={c.textTertiary} accessibilityLabel="Tiene recibo" />
          ) : null}
        </View>
        <Text style={styles.meta}>
          {isTransfer
            ? `${transaction.accountName ?? ''} → ${transaction.toAccountName ?? ''}`
            : transaction.accountName}
          {transaction.categoryName ? ` · ${transaction.categoryName}` : ''}
        </Text>
      </View>

      <Text style={[styles.amount, { color: isTransfer || isDebt ? c.textSecondary : isIncome ? c.income : c.expense }]}>
        {isTransfer ? '' : isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
      </Text>
    </AnimatedPressable>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  notes: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '500',
    color: c.textPrimary,
  },
  meta: {
    fontSize: 12,
    color: c.textTertiary,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
  },
});