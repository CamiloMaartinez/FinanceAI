import type { Goal } from '../models/types';

export function getGoalProgress(goal: Goal): number {
  if (goal.targetAmount <= 0) return 0;
  return Math.min(goal.currentAmount / goal.targetAmount, 1);
}

export function getGoalProgressPercentage(goal: Goal): number {
  return Math.round(getGoalProgress(goal) * 100);
}

export function getGoalRemainingAmount(goal: Goal): number {
  return Math.max(goal.targetAmount - goal.currentAmount, 0);
}

export function getGoalDaysRemaining(goal: Goal): number {
  const today  = new Date();
  const target = new Date(goal.targetDate);
  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function getGoalWeeklySaving(goal: Goal): number {
  const daysRemaining = getGoalDaysRemaining(goal);
  if (daysRemaining <= 0) return 0;
  const weeks = daysRemaining / 7;
  return getGoalRemainingAmount(goal) / Math.max(weeks, 1);
}

export function getGoalMonthlySaving(goal: Goal): number {
  const daysRemaining = getGoalDaysRemaining(goal);
  if (daysRemaining <= 0) return 0;
  const months = daysRemaining / 30;
  return getGoalRemainingAmount(goal) / Math.max(months, 1);
}

// Color de la barra de progreso según el avance
export function getProgressColor(progress: number): string {
  if (progress < 0.3) return '#FF3B30'; // Rojo
  if (progress < 0.7) return '#FF9500'; // Naranja
  return '#34C759';                      // Verde
}