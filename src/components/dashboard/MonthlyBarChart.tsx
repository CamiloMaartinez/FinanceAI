import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { colors, spacing, radius } from '../../constants/theme';
import { formatCurrencyCompact } from '../../utils/currency';
import type { MonthlyChartPoint } from '../../models/types';

interface MonthlyBarChartProps {
  data: MonthlyChartPoint[];
}

const screenWidth = Dimensions.get('window').width;

export function MonthlyBarChart({ data }: MonthlyBarChartProps) {
  if (data.length === 0) return null;

  // gifted-charts necesita los datos intercalados: ingreso, gasto, ingreso, gasto...
  const barData = data.flatMap((point, index) => [
  {
    value:          point.income,
    label:          point.month,
    spacing:        2,
    labelWidth:     30,
    labelTextStyle: { color: colors.textSecondary, fontSize: 10 },
    frontColor:     colors.income,
    barBorderRadius: 4,
  },
  {
    value:           point.expense,
    frontColor:      colors.expense,
    barBorderRadius: 4,
  },
]);

  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.income, d.expense)),
    1
  );

  // Ancho disponible descontando los paddings de la card
  const chartWidth = screenWidth - spacing.lg * 2 - spacing.xl * 2;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Últimos 6 meses</Text>

      <BarChart
        data={barData}
        width={chartWidth}
        height={180}
        barWidth={14}
        spacing={20}
        roundedTop
        roundedBottom
        hideRules
        xAxisThickness={0}
        yAxisThickness={0}
        noOfSections={4}
        maxValue={maxValue * 1.1}
        yAxisTextStyle={{ color: colors.textTertiary, fontSize: 10 }}
        yAxisLabelWidth={45}
        formatYLabel={(label: string) =>
          formatCurrencyCompact(Number(label))
        }
        isAnimated
        animationDuration={600}
      />

      {/* Leyenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
          <Text style={styles.legendLabel}>Ingresos</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
          <Text style={styles.legendLabel}>Gastos</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    padding:         spacing.lg,
  },
  title: {
    fontSize:     15,
    fontWeight:   '600',
    color:        colors.textPrimary,
    marginBottom: spacing.md,
  },
  legend: {
    flexDirection: 'row',
    gap:           spacing.lg,
    marginTop:     spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems:   'center',
    gap:           spacing.xs,
  },
  legendDot: {
    width:        10,
    height:       10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    color:    colors.textSecondary,
  },
});