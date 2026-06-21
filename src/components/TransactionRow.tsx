import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../constants/theme';
import { formatCurrency } from '../utils/currency';
import type { TransactionWithCategory } from '../models/types';

interface TransactionRowProps {
  transaction: TransactionWithCategory;
  onLongPress: (tx: TransactionWithCategory) => void;
}

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  income:     'arrow-down-circle',
  expense:    'arrow-up-circle',
  transfer:   'swap-horizontal',
  investment: 'pie-chart',
  loan:       'business',
  payment:    'checkmark-circle',
};

const TYPE_COLORS: Record<string, string> = {
  income:     colors.income,
  expense:    colors.expense,
  transfer:   colors.blue,
  investment: colors.purple,
  loan:       colors.orange,
  payment:    colors.pink,
};

export function TransactionRow({ transaction, onLongPress }: TransactionRowProps) {
  const icon     = transaction.categoryIcon
    ? (transaction.categoryIcon as keyof typeof Ionicons.glyphMap)
    : (TYPE_ICONS[transaction.type] ?? 'ellipse');
  const color    = transaction.categoryColor ?? TYPE_COLORS[transaction.type] ?? colors.textSecondary;
  const isIncome = transaction.type === 'income' || transaction.type === 'loan';

  return (
    <TouchableOpacity
      style={styles.row}
      onLongPress={() => onLongPress(transaction)}
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

      <Text style={[styles.amount, { color: isIncome ? colors.income : colors.expense }]}>
        {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
    color: colors.textPrimary,
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
  },
});