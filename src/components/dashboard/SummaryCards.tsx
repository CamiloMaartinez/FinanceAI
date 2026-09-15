import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors, spacing, typography } from '../../constants/theme';
import { formatCurrencyCompact } from '../../utils/currency';

interface SummaryCardsProps {
  income: number;
  expenses: number;
}

export function SummaryCards({ income, expenses }: SummaryCardsProps) {
  const c = useColors();
  const savings     = Math.max(income - expenses, 0);
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  const items = [
    { label: 'INGRESOS',  value: formatCurrencyCompact(income),                          color: c.income },
    { label: 'GASTOS',    value: formatCurrencyCompact(expenses),                         color: c.expense },
    { label: 'AHORRO',    value: formatCurrencyCompact(savings),                          color: c.textPrimary },
    { label: 'TASA',      value: `${Math.max(savingsRate, 0).toFixed(1)}%`,              color: savingsRate >= 10 ? c.income : c.textPrimary },
  ];

  const s = StyleSheet.create({
    container: { marginTop: spacing.lg },
    grid: {
      flexDirection: 'row', flexWrap: 'wrap',
      borderWidth: 0.5, borderColor: c.border,
      borderRadius: 8, overflow: 'hidden',
    },
    item: { width: '50%', padding: spacing.lg },
    itemBorderRight: { borderRightWidth: 0.5, borderRightColor: c.border },
    itemBorderBottom: { borderBottomWidth: 0.5, borderBottomColor: c.border },
    label: { ...typography.label, color: c.textTertiary, marginBottom: spacing.xs },
    value: { fontSize: 18, fontWeight: '200', letterSpacing: -0.5, color: c.textPrimary },
    divider: { height: 0.5, backgroundColor: c.borderStrong, marginTop: spacing.xl },
  });

  return (
    <View style={s.container}>
      <View style={s.grid}>
        {items.map((item, index) => (
          <View
            key={item.label}
            style={[
              s.item,
              index % 2 === 0 && s.itemBorderRight,
              index < 2 && s.itemBorderBottom,
            ]}
          >
            <Text style={s.label}>{item.label}</Text>
            <Text style={[s.value, { color: item.color }]}>{item.value}</Text>
          </View>
        ))}
      </View>
      <View style={s.divider} />
    </View>
  );
}