import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useColors, spacing, typography } from '../../constants/theme';
import { formatCurrency, formatDate } from '../../utils/currency';
import type { DashboardData } from '../../models/types';

interface Props {
  transactions: DashboardData['recentTransactions'];
}

export function RecentTransactions({ transactions }: Props) {
  const c = useColors();

  const TYPE_COLORS: Record<string, string> = {
    income:     c.income,
    expense:    c.expense,
    transfer:   c.textSecondary,
    investment: c.income,
    loan:       c.income,
    payment:    c.expense,
    debt_in:    c.orange,
    debt_out:   c.orange,
  };

  const s = StyleSheet.create({
    container: { marginTop: spacing.lg, paddingBottom: spacing.xl },
    title: { ...typography.label, color: c.textTertiary, marginBottom: spacing.lg },
    emptyText: {
      fontSize: 13, fontWeight: '300',
      color: c.textTertiary, paddingVertical: spacing.xl,
    },
    row: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: spacing.md, gap: spacing.md,
    },
    rowBorder: { borderBottomWidth: 0.5, borderBottomColor: c.border },
    accentLine: { width: 2, height: 28, borderRadius: 1, flexShrink: 0 },
    info: { flex: 1 },
    notesText: {
      fontSize: 14, fontWeight: '300',
      color: c.textPrimary, marginBottom: 2,
    },
    metaText: { fontSize: 11, color: c.textTertiary, letterSpacing: 0.3 },
    amount: { fontSize: 14, fontWeight: '300', letterSpacing: -0.3 },
  });

  return (
    <View style={s.container}>
      <Text style={s.title}>MOVIMIENTOS RECIENTES</Text>
      {transactions.length === 0 ? (
        <Text style={s.emptyText}>Sin movimientos registrados</Text>
      ) : (
        transactions.map((tx, index) => {
          const isIncome  = tx.type === 'income' || tx.type === 'loan' || tx.type === 'debt_in';
          const isTransfer = tx.type === 'transfer';
          const isDebt = tx.type === 'debt_in' || tx.type === 'debt_out';
          const lineColor = TYPE_COLORS[tx.type] ?? c.textTertiary;

          return (
            <Animated.View
              key={tx.id}
              entering={FadeInDown.duration(300).delay(index * 60)}
              style={[s.row, index < transactions.length - 1 && s.rowBorder]}
            >
              <View style={[s.accentLine, { backgroundColor: lineColor }]} />
              <View style={s.info}>
                <Text style={s.notesText} numberOfLines={1}>
                  {tx.notes || tx.categoryName || (isTransfer ? 'Transferencia' : 'Movimiento')}
                </Text>
                <Text style={s.metaText}>
                  {formatDate(tx.date)}
                  {tx.categoryName ? `  ·  ${tx.categoryName}` : ''}
                </Text>
              </View>
              <Text style={[s.amount, { color: isTransfer || isDebt ? c.textSecondary : isIncome ? c.income : c.expense }]}>
                {isTransfer ? '' : isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
              </Text>
            </Animated.View>
          );
        })
      )}
    </View>
  );
}