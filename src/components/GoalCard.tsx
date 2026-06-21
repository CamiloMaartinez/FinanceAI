import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../constants/theme';
import { formatCurrency, formatCurrencyCompact } from '../utils/currency';
import {
  getGoalProgress,
  getGoalProgressPercentage,
  getGoalRemainingAmount,
  getGoalDaysRemaining,
  getGoalWeeklySaving,
  getProgressColor,
} from '../utils/goalCalculations';
import type { Goal } from '../models/types';

interface GoalCardProps {
  goal: Goal;
  onContribute: (goal: Goal) => void;
  onLongPress: (goal: Goal) => void;
}

export function GoalCard({ goal, onContribute, onLongPress }: GoalCardProps) {
  const progress       = getGoalProgress(goal);
  const percentage      = getGoalProgressPercentage(goal);
  const remaining        = getGoalRemainingAmount(goal);
  const daysRemaining     = getGoalDaysRemaining(goal);
  const weeklySaving      = getGoalWeeklySaving(goal);
  const progressColor     = getProgressColor(progress);

  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withTiming(progress * 100, { duration: 800 });
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  const isOverdue = daysRemaining < 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onLongPress={() => onLongPress(goal)}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: goal.colorHex + '20' }]}>
          <Ionicons name={goal.iconName as any} size={20} color={goal.colorHex} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.goalName}>{goal.name}</Text>
          <Text style={styles.goalAmounts}>
            {formatCurrencyCompact(goal.currentAmount)} de {formatCurrencyCompact(goal.targetAmount)}
          </Text>
        </View>
        <Text style={[styles.percentage, { color: progressColor }]}>
          {percentage}%
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View
          style={[styles.progressFill, barStyle, { backgroundColor: progressColor }]}
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Ionicons name="calendar-outline" size={13} color={colors.textTertiary} />
          <Text style={styles.footerText}>
            {isOverdue ? 'Fecha vencida' : `${daysRemaining} días restantes`}
          </Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="cash-outline" size={13} color={colors.textTertiary} />
          <Text style={styles.footerText}>
            Faltan {formatCurrencyCompact(remaining)}
          </Text>
        </View>
      </View>

      {!isOverdue && remaining > 0 && (
        <View style={styles.suggestion}>
          <Ionicons name="bulb-outline" size={14} color={colors.orange} />
          <Text style={styles.suggestionText}>
            Ahorra {formatCurrency(weeklySaving)} por semana para llegar a tiempo
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.contributeBtn, { backgroundColor: goal.colorHex }]}
        onPress={() => onContribute(goal)}
      >
        <Ionicons name="add" size={16} color="#fff" />
        <Text style={styles.contributeBtnText}>Abonar</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  goalName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  goalAmounts: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  percentage: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,149,0,0.1)',
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  suggestionText: {
    fontSize: 11,
    color: colors.orange,
    flex: 1,
  },
  contributeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  contributeBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});