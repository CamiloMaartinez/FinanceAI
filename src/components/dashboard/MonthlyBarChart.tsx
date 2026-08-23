import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { colors, spacing, typography } from '../../constants/theme';
import { formatCurrencyCompact } from '../../utils/currency';
import type { MonthlyChartPoint } from '../../models/types';

interface MonthlyBarChartProps {
  data: MonthlyChartPoint[];
}

const screenWidth = Dimensions.get('window').width;

export function MonthlyBarChart({ data }: MonthlyBarChartProps) {
  if (data.length === 0) return null;

  const barData = data.flatMap((point, index) => [
    {
      value: point.income,
      label: point.month,
      spacing: 2,
      labelWidth: 30,
      labelTextStyle: {
        color: colors.textTertiary,
        fontSize: 9,
        letterSpacing: 0.5,
      },
      frontColor: colors.income,
      barBorderRadius: 2,
    },
    {
      value: point.expense,
      frontColor: colors.expense,
      barBorderRadius: 2,
    },
  ]);

  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.income, d.expense)),
    1
  );

  const chartWidth = screenWidth - spacing.lg * 2;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>EVOLUCIÓN MENSUAL</Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
            <Text style={styles.legendText}>Ing</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
            <Text style={styles.legendText}>Gas</Text>
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
        yAxisTextStyle={{
          color: colors.textTertiary,
          fontSize: 9,
          letterSpacing: 0.3,
        }}
        yAxisLabelWidth={42}
        formatYLabel={(label: string) =>
          formatCurrencyCompact(Number(label))
        }
        isAnimated
        animationDuration={800}
      />

      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.label,
    color: colors.textTertiary,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 9,
    color: colors.textTertiary,
    letterSpacing: 0.5,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.borderStrong,
    marginTop: spacing.xl,
  },
});