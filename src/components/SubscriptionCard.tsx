import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../constants/theme';
import { formatCurrency } from '../utils/currency';
import {
  getDaysUntilBilling,
  isUrgent,
  isUpcoming,
} from '../utils/subscriptionCalculations';
import type { Subscription } from '../models/types';

interface SubscriptionCardProps {
  subscription: Subscription;
  onLongPress: (subscription: Subscription) => void;
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly:    'Semanal',
  monthly:   'Mensual',
  quarterly: 'Trimestral',
  annual:    'Anual',
};

export function SubscriptionCard({ subscription, onLongPress }: SubscriptionCardProps) {
  const daysUntil = getDaysUntilBilling(subscription);
  const urgent    = isUrgent(subscription);
  const upcoming  = isUpcoming(subscription);

  let dateLabel: string;
  if (daysUntil < 0) {
    dateLabel = 'Vencida';
  } else if (daysUntil === 0) {
    dateLabel = 'Hoy';
  } else if (daysUntil === 1) {
    dateLabel = 'Mañana';
  } else {
    dateLabel = `En ${daysUntil} días`;
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onLongPress={() => onLongPress(subscription)}
      activeOpacity={0.85}
    >
      <View style={[styles.iconCircle, { backgroundColor: subscription.colorHex + '20' }]}>
        <Ionicons name={subscription.iconName as any} size={22} color={subscription.colorHex} />
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{subscription.name}</Text>
        <Text style={styles.frequency}>
          {FREQUENCY_LABELS[subscription.frequency] ?? subscription.frequency}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.amount}>{formatCurrency(subscription.amount)}</Text>
        <View style={[
          styles.badge,
          urgent && styles.badgeUrgent,
          !urgent && upcoming && styles.badgeUpcoming,
        ]}>
          <Text style={[
            styles.badgeText,
            urgent && styles.badgeTextUrgent,
            !urgent && upcoming && styles.badgeTextUpcoming,
          ]}>
            {dateLabel}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  frequency: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: colors.surfaceSecondary,
  },
  badgeUrgent: {
    backgroundColor: 'rgba(255,59,48,0.15)',
  },
  badgeUpcoming: {
    backgroundColor: 'rgba(255,149,0,0.15)',
  },
  badgeText: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  badgeTextUrgent: {
    color: colors.expense,
    fontWeight: '600',
  },
  badgeTextUpcoming: {
    color: colors.orange,
    fontWeight: '600',
  },
});