import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { colors, spacing, radius } from '../constants/theme';
import { formatCurrency } from '../utils/currency';
import type { CategoryBreakdownItem } from '../hooks/useReports';

interface CategoryPieChartProps {
  data: CategoryBreakdownItem[];
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Gastos por categoría</Text>
        <Text style={styles.emptyText}>
          Sin gastos registrados este mes
        </Text>
      </View>
    );
  }

  const pieData = data.map((item, index) => ({
    value: item.total,
    color: item.categoryColor,
    text: `${item.percentage.toFixed(0)}%`,
    onPress: () => setSelectedIndex(selectedIndex === index ? null : index),
  }));

  const selected = selectedIndex !== null ? data[selectedIndex] : null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Gastos por categoría</Text>

      <View style={styles.chartRow}>
        <PieChart
          data={pieData}
          radius={80}
          innerRadius={50}
          innerCircleColor={colors.surface}
          centerLabelComponent={() => (
            <View style={styles.centerLabel}>
              {selected ? (
                <>
                  <Text style={styles.centerValue} numberOfLines={1}>
                    {formatCurrency(selected.total)}
                  </Text>
                  <Text style={styles.centerCategory} numberOfLines={1}>
                    {selected.categoryName}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.centerValue}>
                    {data.length}
                  </Text>
                  <Text style={styles.centerCategory}>
                    categorías
                  </Text>
                </>
              )}
            </View>
          )}
        />
      </View>

      {/* Lista de categorías con sus montos */}
      <View style={styles.legend}>
        {data.map((item, index) => (
          <View
            key={item.categoryId}
            style={[
              styles.legendRow,
              selectedIndex === index && styles.legendRowSelected,
            ]}
          >
            <View style={[styles.legendDot, { backgroundColor: item.categoryColor }]} />
            <Text style={styles.legendName} numberOfLines={1}>
              {item.categoryName}
            </Text>
            <Text style={styles.legendPercentage}>
              {item.percentage.toFixed(0)}%
            </Text>
            <Text style={styles.legendAmount}>
              {formatCurrency(item.total)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  chartRow: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  centerCategory: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  legend: {
    gap: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  legendRowSelected: {
    backgroundColor: colors.surfaceSecondary,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  legendPercentage: {
    fontSize: 12,
    color: colors.textTertiary,
    width: 36,
    textAlign: 'right',
  },
  legendAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    width: 90,
    textAlign: 'right',
  },
});