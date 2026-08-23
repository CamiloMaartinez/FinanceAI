import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';
import { formatCurrencyCompact } from '../../utils/currency';

interface SummaryCardsProps {
  income: number;
  expenses: number;
}

export function SummaryCards({ income, expenses }: SummaryCardsProps) {
  const savings     = Math.max(income - expenses, 0);
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  const items = [
    { label: 'INGRESOS',     value: formatCurrencyCompact(income),           color: colors.income },
    { label: 'GASTOS',       value: formatCurrencyCompact(expenses),          color: colors.expense },
    { label: 'AHORRO',       value: formatCurrencyCompact(savings),           color: colors.textPrimary },
    { label: 'TASA',         value: `${Math.max(savingsRate, 0).toFixed(1)}%`, color: savingsRate >= 10 ? colors.income : colors.textPrimary },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {items.map((item, index) => (
          <View
            key={item.label}
            style={[
              styles.item,
              index % 2 === 0 && styles.itemBorderRight,
              index < 2 && styles.itemBorderBottom,
            ]}
          >
            <Text style={styles.label}>{item.label}</Text>
            <Text style={[styles.value, { color: item.color }]}>{item.value}</Text>
          </View>
        ))}
      </View>
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  item: {
    width: '50%',
    padding: spacing.lg,
  },
  itemBorderRight: {
    borderRightWidth: 0.5,
    borderRightColor: colors.border,
  },
  itemBorderBottom: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  label: {
    ...typography.label,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: 18,
    fontWeight: '200',
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.borderStrong,
    marginTop: spacing.xl,
  },
});