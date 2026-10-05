import { useState, useCallback, useEffect } from 'react';
import {
  getAllGoals,
  createGoal,
  updateGoal,
  contributeToGoal,
  deleteGoal,
  getGoalAutoContributions,
  createGoalAutoContribution,
  deleteGoalAutoContribution,
} from '../database/db';
import type { Goal, GoalAutoContribution } from '../models/types';
import type { RecurrenceFrequency } from '../utils/recurrence';

interface UseGoalsResult {
  goals: Goal[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addGoal: (
    name: string,
    targetAmount: number,
    targetDate: string,
    priority: string,
    colorHex: string,
    iconName: string
  ) => Promise<void>;
  editGoal: (
    id: string,
    name: string,
    targetAmount: number,
    targetDate: string,
    priority: string,
    colorHex: string,
    iconName: string
  ) => Promise<void>;
  // Con `repeat`, además del aporte de hoy queda programado uno automático
  contribute: (id: string, amount: number, repeat?: RecurrenceFrequency | null) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  autoContributions: GoalAutoContribution[];
  stopAutoContribution: (id: string) => Promise<void>;
}

export function useGoals(): UseGoalsResult {
  const [goals,     setGoals]     = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [autoContributions, setAutoContributions] = useState<GoalAutoContribution[]>([]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [rows, autos] = await Promise.all([getAllGoals(), getGoalAutoContributions()]);
      setGoals(rows);
      setAutoContributions(autos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando metas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addGoal = useCallback(async (
    name: string,
    targetAmount: number,
    targetDate: string,
    priority: string,
    colorHex: string,
    iconName: string
  ) => {
    await createGoal(name, targetAmount, targetDate, priority, colorHex, iconName);
    await load();
  }, [load]);

  const editGoal = useCallback(async (
    id: string,
    name: string,
    targetAmount: number,
    targetDate: string,
    priority: string,
    colorHex: string,
    iconName: string
  ) => {
    await updateGoal(id, name, targetAmount, targetDate, priority, colorHex, iconName);
    await load();
  }, [load]);

  const contribute = useCallback(async (id: string, amount: number, repeat?: RecurrenceFrequency | null) => {
    await contributeToGoal(id, amount);
    if (repeat) await createGoalAutoContribution(id, amount, repeat, new Date());
    await load();
  }, [load]);

  const stopAutoContribution = useCallback(async (id: string) => {
    await deleteGoalAutoContribution(id);
    await load();
  }, [load]);

  const removeGoal = useCallback(async (id: string) => {
    await deleteGoal(id);
    await load();
  }, [load]);

  return {
    goals,
    isLoading,
    error,
    refresh: load,
    addGoal,
    editGoal,
    contribute,
    removeGoal,
    autoContributions,
    stopAutoContribution,
  };
}