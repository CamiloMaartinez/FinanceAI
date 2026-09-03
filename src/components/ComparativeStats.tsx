import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, radius } from '../constants/theme';
import { SPENDING_BENCHMARKS } from '../data/spendingBenchmarks';
import type { CategoryBreakdownItem } from '../hooks/useReports';

interface ComparativeStatsProps {
  breakdown: CategoryBreakdownItem[];
  monthlyIncome: number;
}

export function ComparativeStats({ breakdown, monthlyIncome }: ComparativeStatsProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);

  if (monthlyIncome <= 0) return null;

  const comparisons = breakdown
    .filter((item) => SPENDING_BENCHMARKS[item.categoryId] !== undefined)
    .map((item) => {
      const userPercent = (item.total / monthlyIncome) * 100;
      const benchmarkPercent = SPENDING_BENCHMARKS[item.categoryId] * 100;
      const diff = userPercent - benchmarkPercent;
      return { ...item, userPercent, benchmarkPercent, diff };
    })
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 4);

  if (comparisons.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="stats-chart-outline" size={15} color={c.textSecondary} />
        <Text style={styles.title}>ESTADÍSTICAS COMPARATIVAS</Text>
      </View>
      <Text style={styles.disclaimer}>
        Comparado con porcentajes de referencia de un presupuesto típico — no son datos de otros usuarios de la app.
      </Text>

      {comparisons.map((item) => {
        const isOver = item.diff > 2; // margen de 2pp antes de marcarlo como "por encima"
        const isUnder = item.diff < -2;
        const color = isOver ? c.expense : isUnder ? c.income : c.textSecondary;
        const verb = isOver ? 'más' : isUnder ? 'menos' : 'similar a';

        return (
          <View key={item.categoryId} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: item.categoryColor }]} />
            <Text style={styles.rowText}>
              <Text style={styles.rowCategory}>{item.categoryName}: </Text>
              gastas {Math.round(item.userPercent)}% de tus ingresos
              {isOver || isUnder ? (
                <Text style={{ color, fontWeight: '700' }}>
                  {' '}({Math.abs(Math.round(item.diff))}pp {verb} que la referencia)
                </Text>
              ) : (
                <Text style={{ color }}> (similar a la referencia)</Text>
              )}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 11, fontWeight: '700', color: c.textSecondary, letterSpacing: 0.5 },
  disclaimer: { fontSize: 11, color: c.textTertiary, lineHeight: 15, marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  rowText: { flex: 1, fontSize: 12.5, color: c.textSecondary, lineHeight: 18 },
  rowCategory: { fontWeight: '600', color: c.textPrimary },
});
