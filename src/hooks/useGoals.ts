import { useState, useCallback, useEffect } from 'react';
import {
  getAllGoals,
  createGoal,
  contributeToGoal,
  deleteGoal,
} from '../database/db';
import type { Goal } from '../models/types';

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
  contribute: (id: string, amount: number) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
}

export function useGoals(): UseGoalsResult {
  const [goals,     setGoals]     = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await getAllGoals();
      setGoals(rows);
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

  const contribute = useCallback(async (id: string, amount: number) => {
    await contributeToGoal(id, amount);
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
    contribute,
    removeGoal,
  };
}