import { useState, useCallback, useEffect } from 'react';
import {
  getBudgetForMonth,
  upsertBudget,
  deleteBudget,
  getCategoryBreakdown,
  getAllCategories,
  getMonthlyTotals,
} from '../database/db';
import type { Budget } from '../models/types';
import { suggestBudget } from '../services/ai';
import { averageCategorySpending, baselineSuggestion, type BudgetSuggestion } from '../utils/budgetSuggestion';

export interface CategoryBudgetProgress {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  limit: number;
  spent: number;
  percent: number;
}

interface UseBudgetsResult {
  budget: Budget | null;
  totalLimit: number;
  totalSpent: number;
  totalPercent: number;
  categories: CategoryBudgetProgress[];
  month: number;
  year: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveBudget: (totalLimit: number, categoryLimits: Record<string, number>, isAIGenerated?: boolean) => Promise<void>;
  // Propuesta de presupuesto (IA, o el promedio si no hay conexión)
  suggestWithAI: () => Promise<BudgetSuggestion>;
  removeBudget: () => Promise<void>;
}

export function useBudgets(): UseBudgetsResult {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [budget, setBudget] = useState<Budget | null>(null);
  const [totalSpent, setTotalSpent] = useState(0);
  const [categories, setCategories] = useState<CategoryBudgetProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [budgetData, breakdown, allCategories, totals] = await Promise.all([
        getBudgetForMonth(month, year),
        getCategoryBreakdown(month, year),
        getAllCategories(),
        getMonthlyTotals(month, year),
      ]);

      setBudget(budgetData);
      setTotalSpent(totals.expense);

      if (budgetData) {
        const rows: CategoryBudgetProgress[] = Object.entries(budgetData.categoryLimits)
          .filter(([, limit]) => limit > 0)
          .map(([categoryId, limit]) => {
            const cat = allCategories.find((c) => c.id === categoryId);
            const spentRow = breakdown.find((b) => b.categoryId === categoryId);
            const spent = spentRow?.total ?? 0;
            return {
              categoryId,
              categoryName: cat?.name ?? 'Categoría eliminada',
              categoryColor: cat?.colorHex ?? '#8E8E93',
              categoryIcon: cat?.iconName ?? 'ellipse-outline',
              limit,
              spent,
              percent: limit > 0 ? (spent / limit) * 100 : 0,
            };
          })
          .sort((a, b) => b.percent - a.percent);

        setCategories(rows);
      } else {
        setCategories([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando el presupuesto');
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    load();
  }, [load]);

  const saveBudget = useCallback(
    async (totalLimit: number, categoryLimits: Record<string, number>, isAIGenerated = false) => {
      await upsertBudget(month, year, totalLimit, categoryLimits, isAIGenerated);
      await load();
    },
    [month, year, load]
  );

  // Analiza los últimos 3 meses completos (sin contar el actual)
  const suggestWithAI = useCallback(async (): Promise<BudgetSuggestion> => {
    const months = await Promise.all([1, 2, 3].map(async (back) => {
      const d = new Date(year, month - 1 - back, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const [breakdown, totals] = await Promise.all([getCategoryBreakdown(m, y), getMonthlyTotals(m, y)]);
      return {
        income: totals.income,
        categories: breakdown.map((b) => ({ categoryId: b.categoryId, name: b.categoryName, total: b.total })),
      };
    }));
    const history = averageCategorySpending(months);
    if (history.categories.length === 0) {
      throw new Error('Necesitas al menos un mes completo de gastos registrados para sugerir un presupuesto.');
    }
    try {
      return await suggestBudget(history);
    } catch {
      return baselineSuggestion(history); // sin conexión: el promedio
    }
  }, [month, year]);

  const removeBudget = useCallback(async () => {
    if (!budget) return;
    await deleteBudget(budget.id);
    await load();
  }, [budget, load]);

  const totalLimit = budget?.totalLimit ?? 0;
  const totalPercent = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

  return {
    budget,
    totalLimit,
    totalSpent,
    totalPercent,
    categories,
    month,
    year,
    isLoading,
    error,
    refresh: load,
    saveBudget,
    suggestWithAI,
    removeBudget,
  };
}
