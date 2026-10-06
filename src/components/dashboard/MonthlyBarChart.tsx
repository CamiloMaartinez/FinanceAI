import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text } from '../ui/Text';
import { BarChart } from 'react-native-gifted-charts';
import { useColors, spacing, fonts } from '../../constants/theme';
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
      frontColor: c.lime,
      barBorderRadius: 6,
    },
    {
      value: point.expense,
      frontColor: c.magenta,
      barBorderRadius: 6,
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
    title: { fontFamily: fonts.bold, fontSize: 18, color: c.textPrimary },
    legend: { flexDirection: 'row', gap: spacing.md },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontFamily: fonts.medium, fontSize: 12, color: c.textSecondary },
    divider: { height: spacing.sm },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title} accessibilityRole="header">Ingresos y gastos</Text>
        <View style={s.legend}>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: c.lime }]} />
            <Text style={s.legendText}>Ingresos</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: c.magenta }]} />
            <Text style={s.legendText}>Gastos</Text>
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