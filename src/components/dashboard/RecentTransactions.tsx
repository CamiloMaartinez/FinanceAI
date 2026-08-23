import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';
import { formatCurrency, formatDate } from '../../utils/currency';
import type { DashboardData } from '../../models/types';

interface Props {
  transactions: DashboardData['recentTransactions'];
}

const TYPE_COLORS: Record<string, string> = {
  income:     colors.income,
  expense:    colors.expense,
  transfer:   'rgba(255,255,255,0.3)',
  investment: colors.income,
  loan:       colors.income,
  payment:    colors.expense,
};

export function RecentTransactions({ transactions }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MOVIMIENTOS RECIENTES</Text>

      {transactions.length === 0 ? (
        <Text style={styles.emptyText}>Sin movimientos registrados</Text>
      ) : (
        transactions.map((tx, index) => {
          const isIncome = tx.type === 'income' || tx.type === 'loan';
          const lineColor = TYPE_COLORS[tx.type] ?? colors.textTertiary;

          return (
            <View
              key={tx.id}
              style={[
                styles.row,
                index < transactions.length - 1 && styles.rowBorder,
              ]}
            >
              {/* Línea vertical de acento */}
              <View style={[styles.accentLine, { backgroundColor: lineColor }]} />

              {/* Info */}
              <View style={styles.info}>
                <Text style={styles.notesText} numberOfLines={1}>
                  {tx.notes || tx.categoryName || 'Movimiento'}
                </Text>
                <Text style={styles.metaText}>
                  {formatDate(tx.date)}
                  {tx.categoryName ? `  ·  ${tx.categoryName}` : ''}
                </Text>
              </View>

              {/* Monto */}
              <Text style={[
                styles.amount,
                { color: isIncome ? colors.income : colors.expense },
              ]}>
                {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.label,
    color: colors.textTertiary,
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '300',
    color: colors.textTertiary,
    paddingVertical: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  accentLine: {
    width: 2,
    height: 28,
    borderRadius: 1,
    flexShrink: 0,
  },
  info: {
    flex: 1,
  },
  notesText: {
    fontSize: 14,
    fontWeight: '300',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  metaText: {
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 0.3,
  },
  amount: {
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: -0.3,
  },
});