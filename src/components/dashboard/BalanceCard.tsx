import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';

interface BalanceCardProps {
  totalBalance: number;
  netFlow: number;
}

export function BalanceCard({ totalBalance, netFlow }: BalanceCardProps) {
  const [isVisible, setIsVisible] = useState(true);
  const isPositive = netFlow >= 0;

  return (
    <View style={styles.container}>
      {/* Etiqueta superior */}
      <View style={styles.header}>
        <Text style={styles.label}>PATRIMONIO TOTAL</Text>
        <TouchableOpacity onPress={() => setIsVisible(!isVisible)}>
          <Ionicons
            name={isVisible ? 'eye-outline' : 'eye-off-outline'}
            size={14}
            color={colors.textTertiary}
          />
        </TouchableOpacity>
      </View>

      {/* Monto principal */}
      <Text style={styles.amount}>
        {isVisible ? formatCurrency(totalBalance) : '••••••••'}
      </Text>

      {/* Flujo neto */}
      <View style={styles.flowRow}>
        <Text style={styles.flowIcon}>{isPositive ? '↑' : '↓'}</Text>
        <Text style={[styles.flowText, { color: isPositive ? colors.income : colors.expense }]}>
          {isPositive ? '+' : '-'}{formatCurrency(Math.abs(netFlow))} este mes
        </Text>
      </View>

      {/* Línea divisora */}
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.textTertiary,
  },
  amount: {
    fontSize: 38,
    fontWeight: '200',
    color: colors.textPrimary,
    letterSpacing: -1.5,
    marginBottom: spacing.sm,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  flowIcon: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  flowText: {
    fontSize: 13,
    fontWeight: '300',
    letterSpacing: 0.2,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.borderStrong,
  },
});