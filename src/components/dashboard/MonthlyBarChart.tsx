import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useColors, spacing, typography } from '../../constants/theme';
import { formatCurrencyCompact } from '../../utils/currency';
import type { MonthlyChartPoint } from '../../models/types';

interface MonthlyBarChartProps {
  data: MonthlyChartPoint[];
}

const screenWidth = Dimensions.get('window').width;

export function MonthlyBarChart({ data }: MonthlyBarChartProps) {
  const c = useColors();

  if (data.length === 0) return null;

  const barData = data.flatMap((point) => [
    {
      value: point.income,
      label: point.month,
      spacing: 2,
      labelWidth: 30,
      labelTextStyle: { color: c.textTertiary, fontSize: 9, letterSpacing: 0.5 },
      frontColor: c.income,
      barBorderRadius: 2,
    },
    {
      value: point.expense,
      frontColor: c.expense,
      barBorderRadius: 2,
    },
  ]);

  const maxValue = Math.max(...data.map((d) => Math.max(d.income, d.expense)), 1);
  const chartWidth = screenWidth - spacing.lg * 2;

  const s = StyleSheet.create({
    container: { marginTop: spacing.lg },
    header: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', marginBottom: spacing.lg,
    },
    title: { ...typography.label, color: c.textTertiary },
    legend: { flexDirection: 'row', gap: spacing.md },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    legendDot: { width: 6, height: 6, borderRadius: 3 },
    legendText: { fontSize: 9, color: c.textTertiary, letterSpacing: 0.5 },
    divider: { height: 0.5, backgroundColor: c.borderStrong, marginTop: spacing.xl },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>EVOLUCIÓN MENSUAL</Text>
        <View style={s.legend}>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: c.income }]} />
            <Text style={s.legendText}>Ing</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: c.expense }]} />
            <Text style={s.legendText}>Gas</Text>
          </View>
        </View>
      </View>

      <BarChart
        data={barData}
        width={chartWidth}
        height={140}
        barWidth={12}
        spacing={18}
        hideRules
        xAxisThickness={0}
        yAxisThickness={0}
        noOfSections={3}
        maxValue={maxValue * 1.15}
        yAxisTextStyle={{ color: c.textTertiary, fontSize: 9, letterSpacing: 0.3 }}
        yAxisLabelWidth={42}
        formatYLabel={(label: string) => formatCurrencyCompact(Number(label))}
        isAnimated
        animationDuration={800}
      />

      <View style={s.divider} />
    </View>
  );
}