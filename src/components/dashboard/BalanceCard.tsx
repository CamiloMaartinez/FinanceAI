import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, typography } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';

interface BalanceCardProps {
  totalBalance: number;
  netFlow: number;
}

export function BalanceCard({ totalBalance, netFlow }: BalanceCardProps) {
  const [isVisible, setIsVisible] = useState(true);
  const c = useColors();
  const isPositive = netFlow >= 0;

  const s = StyleSheet.create({
    container: { paddingVertical: spacing.xl },
    header: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', marginBottom: spacing.sm,
    },
    label: { ...typography.label, color: c.textTertiary },
    amount: {
      fontSize: 38, fontWeight: '200',
      color: c.textPrimary, letterSpacing: -1.5, marginBottom: spacing.sm,
    },
    flowRow: {
      flexDirection: 'row', alignItems: 'center',
      gap: spacing.xs, marginBottom: spacing.xl,
    },
    flowIcon: { fontSize: 12, color: c.textTertiary },
    flowText: { fontSize: 13, fontWeight: '300', letterSpacing: 0.2 },
    divider: { height: 0.5, backgroundColor: c.borderStrong },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.label}>PATRIMONIO TOTAL</Text>
        <TouchableOpacity onPress={() => setIsVisible(!isVisible)}>
          <Ionicons
            name={isVisible ? 'eye-outline' : 'eye-off-outline'}
            size={14}
            color={c.textTertiary}
          />
        </TouchableOpacity>
      </View>
      <Text style={s.amount}>
        {isVisible ? formatCurrency(totalBalance) : '••••••••'}
      </Text>
      <View style={s.flowRow}>
        <Text style={s.flowIcon}>{isPositive ? '↑' : '↓'}</Text>
        <Text style={[s.flowText, { color: isPositive ? c.income : c.expense }]}>
          {isPositive ? '+' : '-'}{formatCurrency(Math.abs(netFlow))} este mes
        </Text>
      </View>
      <View style={s.divider} />
    </View>
  );
}