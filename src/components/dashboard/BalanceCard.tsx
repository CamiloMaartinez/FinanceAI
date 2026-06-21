import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
    import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';

interface BalanceCardProps {
  totalBalance: number;
  netFlow: number;
}

export function BalanceCard({ totalBalance, netFlow }: BalanceCardProps) {
  const [isVisible, setIsVisible] = useState(true);
  const isPositive = netFlow >= 0;

  return (
    <View style={styles.card}>

      {/* Círculos decorativos de fondo */}
      <View style={[styles.circle, styles.circleTop]} />
      <View style={[styles.circle, styles.circleBottom]} />

      {/* Fila superior: etiqueta + botón ojo */}
      <View style={styles.header}>
        <Text style={styles.label}>Saldo Total</Text>
        <TouchableOpacity onPress={() => setIsVisible(!isVisible)}>
          <Ionicons
            name={isVisible ? 'eye' : 'eye-off'}
            size={18}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Saldo principal */}
      <Text style={styles.balance}>
        {isVisible ? formatCurrency(totalBalance) : '••••••••'}
      </Text>

      {/* Línea divisora */}
      <View style={styles.divider} />

      {/* Fila inferior: flujo neto del mes */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Ionicons
            name={isPositive ? 'arrow-up-circle' : 'arrow-down-circle'}
            size={14}
            color={colors.textSecondary}
          />
          <Text style={styles.footerLabel}>Flujo neto del mes</Text>
        </View>
        <Text style={[
          styles.footerValue,
          { color: isPositive ? colors.income : colors.expense }
        ]}>
          {isPositive ? '+' : '-'}{formatCurrency(Math.abs(netFlow))}
        </Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1C1C2E',
    borderRadius: radius.xl,
    padding: spacing.xl,
    height: 180,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circleTop: {
    width: 200,
    height: 200,
    top: -70,
    right: -50,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  circleBottom: {
    width: 150,
    height: 150,
    bottom: -60,
    left: -40,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  balance: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  footerValue: {
    fontSize: 15,
    fontWeight: '700',
  },
});