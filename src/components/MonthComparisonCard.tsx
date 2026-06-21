import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../constants/theme';
import { formatCurrency } from '../utils/currency';

interface MonthComparisonCardProps {
  currentMonthExpense: number;
  previousMonthExpense: number;
  monthOverMonthChange: number;
}

export function MonthComparisonCard({
  currentMonthExpense,
  previousMonthExpense,
  monthOverMonthChange,
}: MonthComparisonCardProps) {
  const isIncrease = monthOverMonthChange > 0;
  const isNeutral  = previousMonthExpense === 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Comparativa mensual</Text>

      <View style={styles.row}>
        <View style={styles.column}>
          <Text style={styles.label}>Mes anterior</Text>
          <Text style={styles.value}>{formatCurrency(previousMonthExpense)}</Text>
        </View>

        <Ionicons name="arrow-forward" size={18} color={colors.textTertiary} />

        <View style={styles.column}>
          <Text style={styles.label}>Este mes</Text>
          <Text style={styles.value}>{formatCurrency(currentMonthExpense)}</Text>
        </View>
      </View>

      {!isNeutral && (
        <View style={[
          styles.changeBox,
          isIncrease ? styles.changeBoxIncrease : styles.changeBoxDecrease,
        ]}>
          <Ionicons
            name={isIncrease ? 'trending-up' : 'trending-down'}
            size={16}
            color={isIncrease ? colors.expense : colors.income}
          />
          <Text style={[
            styles.changeText,
            { color: isIncrease ? colors.expense : colors.income },
          ]}>
            {isIncrease ? 'Gastaste' : 'Ahorraste'} {Math.abs(monthOverMonthChange).toFixed(0)}% {isIncrease ? 'más' : 'menos'} que el mes anterior
          </Text>
        </View>
      )}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  changeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  changeBoxIncrease: {
    backgroundColor: 'rgba(255,59,48,0.1)',
  },
  changeBoxDecrease: {
    backgroundColor: 'rgba(52,199,89,0.1)',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});