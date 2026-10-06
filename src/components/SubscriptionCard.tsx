import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, radius } from '../constants/theme';
import { formatCurrency } from '../utils/currency';
import {
  getDaysUntilBilling,
  isUrgent,
  isUpcoming,
} from '../utils/subscriptionCalculations';
import { AnimatedPressable } from './ui/AnimatedPressable';
import type { Subscription } from '../models/types';

interface SubscriptionCardProps {
  subscription: Subscription;
  onPress: (subscription: Subscription) => void;
  onLongPress: (subscription: Subscription) => void;
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly:    'Semanal',
  monthly:   'Mensual',
  quarterly: 'Trimestral',
  annual:    'Anual',
};

export function SubscriptionCard({ subscription, onPress, onLongPress }: SubscriptionCardProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
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
    <AnimatedPressable
      style={styles.card}
      onPress={() => onPress(subscription)}
      onLongPress={() => onLongPress(subscription)}
      pressScale={0.98}
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
    </AnimatedPressable>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
    ...c.shadow.sm,
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
    color: c.textPrimary,
  },
  frequency: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: c.surfaceSecondary,
  },
  badgeUrgent: {
    backgroundColor: c.expense + '26',
  },
  badgeUpcoming: {
    backgroundColor: c.orange + '26',
  },
  badgeText: {
    fontSize: 11,
    color: c.textTertiary,
  },
  badgeTextUrgent: {
    color: c.expense,
    fontWeight: '600',
  },
  badgeTextUpcoming: {
    color: c.orange,
    fontWeight: '600',
  },
});