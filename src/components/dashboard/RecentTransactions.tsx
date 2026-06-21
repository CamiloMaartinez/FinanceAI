import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../constants/theme';
import { formatCurrency, formatDate } from '../../utils/currency';
import type { DashboardData } from '../../models/types';

interface Props {
  transactions: DashboardData['recentTransactions'];
}

// Ícono por tipo de transacción
const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  income:     'arrow-down-circle',
  expense:    'arrow-up-circle',
  transfer:   'swap-horizontal',
  investment: 'pie-chart',
  loan:       'business',
  payment:    'checkmark-circle',
};

// Color por tipo de transacción
const TYPE_COLORS: Record<string, string> = {
  income:     colors.income,
  expense:    colors.expense,
  transfer:   colors.blue,
  investment: colors.purple,
  loan:       colors.orange,
  payment:    colors.pink,
};

export function RecentTransactions({ transactions }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Últimos movimientos</Text>

      {/* Si no hay transacciones mostramos un mensaje vacío */}
      {transactions.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name="receipt-outline"
            size={32}
            color={colors.textTertiary}
          />
          <Text style={styles.emptyText}>
            Sin movimientos todavía
          </Text>
          <Text style={styles.emptySubText}>
            Agrega tu primera transacción
          </Text>
        </View>
      ) : (
        transactions.map((tx, index) => {
          const icon     = TYPE_ICONS[tx.type]  ?? 'ellipse';
          const color    = TYPE_COLORS[tx.type] ?? colors.textSecondary;
          const isIncome = tx.type === 'income' || tx.type === 'loan';
          const isLast   = index === transactions.length - 1;

          return (
            <View
              key={tx.id}
              style={[styles.row, !isLast && styles.rowBorder]}
            >
              {/* Ícono del tipo */}
              <View style={[
                styles.iconCircle,
                { backgroundColor: color + '20' }
              ]}>
                <Ionicons name={icon} size={18} color={color} />
              </View>

              {/* Descripción y fecha */}
              <View style={styles.info}>
                <Text style={styles.notes} numberOfLines={1}>
                  {tx.notes || tx.categoryName || 'Movimiento'}
                </Text>
                <Text style={styles.date}>
                  {formatDate(tx.date)}
                  {tx.categoryName ? ` · ${tx.categoryName}` : ''}
                </Text>
              </View>

              {/* Monto */}
              <Text style={[
                styles.amount,
                { color: isIncome ? colors.income : colors.expense }
              ]}>
                {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
              </Text>
            </View>
          );
        })
      )}
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
  empty: {
    alignItems:     'center',
    paddingVertical: spacing.xl,
    gap:             spacing.sm,
  },
  emptyText: {
    fontSize:   14,
    fontWeight: '500',
    color:      colors.textSecondary,
  },
  emptySubText: {
    fontSize: 12,
    color:    colors.textTertiary,
  },
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingVertical: spacing.md,
    gap:           spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  iconCircle: {
    width:           40,
    height:          40,
    borderRadius:    20,
    alignItems:      'center',
    justifyContent:  'center',
  },
  info: {
    flex: 1,
  },
  notes: {
    fontSize:     14,
    fontWeight:   '500',
    color:        colors.textPrimary,
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color:    colors.textTertiary,
  },
  amount: {
    fontSize:   14,
    fontWeight: '700',
  },
});