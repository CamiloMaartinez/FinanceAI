import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../constants/theme';
import { formatCurrencyCompact } from '../../utils/currency';

interface SummaryCardsProps {
  income: number;
  expenses: number;
}

interface CardConfig {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
}

export function SummaryCards({ income, expenses }: SummaryCardsProps) {
  const savings     = Math.max(income - expenses, 0);
  const savingsRate = income > 0
    ? ((income - expenses) / income) * 100
    : 0;

  const cards: CardConfig[] = [
    {
      title:     'Ingresos',
      value:     formatCurrencyCompact(income),
      icon:      'arrow-down-circle',
      iconColor: colors.income,
      bgColor:   'rgba(52,199,89,0.12)',
    },
    {
      title:     'Gastos',
      value:     formatCurrencyCompact(expenses),
      icon:      'arrow-up-circle',
      iconColor: colors.expense,
      bgColor:   'rgba(255,59,48,0.12)',
    },
    {
      title:     'Ahorro',
      value:     formatCurrencyCompact(savings),
      icon:      'wallet',
      iconColor: colors.blue,
      bgColor:   'rgba(0,122,255,0.12)',
    },
    {
      title:     'Tasa de ahorro',
      value:     `${Math.max(savingsRate, 0).toFixed(1)}%`,
      icon:      'trending-up',
      iconColor: colors.purple,
      bgColor:   'rgba(88,86,214,0.12)',
    },
  ];

  return (
    <View style={styles.grid}>
      {cards.map((card) => (
        <View key={card.title} style={styles.card}>

          {/* Ícono con fondo de color */}
          <View style={[styles.iconCircle, { backgroundColor: card.bgColor }]}>
            <Ionicons name={card.icon} size={20} color={card.iconColor} />
          </View>

          {/* Valor numérico */}
          <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
            {card.value}
          </Text>

          {/* Etiqueta */}
          <Text style={styles.title}>{card.title}</Text>

        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  value: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  title: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});