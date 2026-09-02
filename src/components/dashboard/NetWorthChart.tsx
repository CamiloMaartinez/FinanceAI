import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useColors, spacing, typography } from '../../constants/theme';
import { formatCurrencyCompact } from '../../utils/currency';

interface NetWorthChartProps {
  data: { label: string; value: number }[];
}

const screenWidth = Dimensions.get('window').width;

export function NetWorthChart({ data }: NetWorthChartProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);

  if (data.length < 2) return null;

  const values = data.map((d) => d.value);
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 1);
  const first = values[0];
  const last = values[values.length - 1];
  const change = last - first;
  const isPositive = change >= 0;

  const chartData = data.map((point) => ({
    value: point.value,
    label: point.label,
    labelTextStyle: { color: c.textTertiary, fontSize: 9, letterSpacing: 0.3 },
  }));

  const chartWidth = screenWidth - spacing.lg * 2 - 42;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>EVOLUCIÓN DEL PATRIMONIO</Text>
        <View style={styles.changeRow}>
          <Text style={[styles.changeText, { color: isPositive ? c.income : c.expense }]}>
            {isPositive ? '+' : ''}{formatCurrencyCompact(change)}
          </Text>
        </View>
      </View>

      <LineChart
        data={chartData}
        width={chartWidth}
        height={140}
        color={isPositive ? c.income : c.expense}
        thickness={2.5}
        startFillColor={isPositive ? c.income : c.expense}
        endFillColor={c.background}
        startOpacity={0.25}
        endOpacity={0}
        areaChart
        curved
        hideRules
        hideYAxisText={false}
        yAxisThickness={0}
        xAxisThickness={0}
        yAxisTextStyle={{ color: c.textTertiary, fontSize: 9, letterSpacing: 0.3 }}
        yAxisLabelWidth={42}
        formatYLabel={(label: string) => formatCurrencyCompact(Number(label))}
        noOfSections={3}
        maxValue={maxValue * 1.1}
        mostNegativeValue={minValue < 0 ? minValue * 1.1 : 0}
        initialSpacing={10}
        endSpacing={10}
        isAnimated
        animationDuration={800}
        dataPointsColor={isPositive ? c.income : c.expense}
        dataPointsRadius={3}
      />

      <View style={styles.divider} />
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { marginTop: spacing.lg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.lg,
  },
  title: { ...typography.label, color: c.textTertiary },
  changeRow: { flexDirection: 'row' },
  changeText: { fontSize: 12, fontWeight: '700' },
  divider: { height: 0.5, backgroundColor: c.borderStrong, marginTop: spacing.xl },
});
