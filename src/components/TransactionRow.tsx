import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing } from '../constants/theme';
import { formatCurrency } from '../utils/currency';
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
};

const getTypeColors = (c: ReturnType<typeof useColors>): Record<string, string> => ({
  income:     c.income,
  expense:    c.expense,
  transfer:   c.blue,
  investment: c.purple,
  loan:       c.orange,
  payment:    c.pink,
});

export function TransactionRow({ transaction, onPress, onLongPress }: TransactionRowProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const icon     = transaction.categoryIcon
    ? (transaction.categoryIcon as keyof typeof Ionicons.glyphMap)
    : (TYPE_ICONS[transaction.type] ?? 'ellipse');
  const color    = transaction.categoryColor ?? getTypeColors(c)[transaction.type] ?? c.textSecondary;
  const isIncome = transaction.type === 'income' || transaction.type === 'loan';

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress ? () => onPress(transaction) : undefined}
      onLongPress={onLongPress ? () => onLongPress(transaction) : undefined}
      activeOpacity={0.7}
    >
      <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>

      <View style={styles.info}>
        <Text style={styles.notes} numberOfLines={1}>
          {transaction.notes || transaction.categoryName || 'Movimiento'}
        </Text>
        <Text style={styles.meta}>
          {transaction.accountName}
          {transaction.categoryName ? ` · ${transaction.categoryName}` : ''}
        </Text>
      </View>

      <Text style={[styles.amount, { color: isIncome ? c.income : c.expense }]}>
        {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
      </Text>
    </TouchableOpacity>
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
  notes: {
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
});