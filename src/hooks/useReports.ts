import { useState, useCallback, useEffect } from 'react';
import { getCategoryBreakdown, getMonthlyTotals, getBudgetForMonth } from '../database/db';
import { getMonthProgress, projectMonthEnd } from '../utils/predictionCalculations';

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  total: number;
  percentage: number;
}

export interface MonthPrediction {
  spentSoFar: number;
  projectedTotal: number;
  historicalAverage: number | null; // null si no hay suficiente historial
  budgetLimit: number | null;
  dayOfMonth: number;
  daysInMonth: number;
}

interface UseReportsResult {
  breakdown: CategoryBreakdownItem[];
  currentMonthExpense: number;
  previousMonthExpense: number;
  monthOverMonthChange: number;
  prediction: MonthPrediction | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useReports(): UseReportsResult {
  const [breakdown,             setBreakdown]             = useState<CategoryBreakdownItem[]>([]);
  const [currentMonthExpense,   setCurrentMonthExpense]   = useState(0);
  const [previousMonthExpense,  setPreviousMonthExpense]  = useState(0);
  const [prediction,            setPrediction]            = useState<MonthPrediction | null>(null);
  const [isLoading,             setIsLoading]             = useState(true);
  const [error,                 setError]                 = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear  = now.getFullYear();

      // Mes anterior (manejando el cambio de año en enero)
      const prevDate  = new Date(currentYear, now.getMonth() - 1, 1);
      const prevMonth = prevDate.getMonth() + 1;
      const prevYear  = prevDate.getFullYear();

      // Dos meses antes de ese, para tener 3 meses de historial de referencia
      const prev2Date  = new Date(currentYear, now.getMonth() - 2, 1);
      const prev3Date  = new Date(currentYear, now.getMonth() - 3, 1);

      const [rawBreakdown, currentTotals, previousTotals, prev2Totals, prev3Totals, budget] = await Promise.all([
        getCategoryBreakdown(currentMonth, currentYear),
        getMonthlyTotals(currentMonth, currentYear),
        getMonthlyTotals(prevMonth, prevYear),
        getMonthlyTotals(prev2Date.getMonth() + 1, prev2Date.getFullYear()),
        getMonthlyTotals(prev3Date.getMonth() + 1, prev3Date.getFullYear()),
        getBudgetForMonth(currentMonth, currentYear),
      ]);

      const totalExpense = rawBreakdown.reduce((sum, item) => sum + item.total, 0);

      const breakdownWithPercentage: CategoryBreakdownItem[] = rawBreakdown.map((item) => ({
        ...item,
        percentage: totalExpense > 0 ? (item.total / totalExpense) * 100 : 0,
      }));

      setBreakdown(breakdownWithPercentage);
      setCurrentMonthExpense(currentTotals.expense);
      setPreviousMonthExpense(previousTotals.expense);

      // Predicción del mes: proyección lineal según el ritmo de gasto actual
      const { dayOfMonth, daysInMonth } = getMonthProgress(now);
      const historicalMonths = [previousTotals.expense, prev2Totals.expense, prev3Totals.expense]
        .filter((v) => v > 0);
      const historicalAverage = historicalMonths.length > 0
        ? historicalMonths.reduce((sum, v) => sum + v, 0) / historicalMonths.length
        : null;

      setPrediction({
        spentSoFar: currentTotals.expense,
        projectedTotal: projectMonthEnd(currentTotals.expense, dayOfMonth, daysInMonth),
        historicalAverage,
        budgetLimit: budget && budget.totalLimit > 0 ? budget.totalLimit : null,
        dayOfMonth,
        daysInMonth,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando reportes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const monthOverMonthChange =
    previousMonthExpense > 0
      ? ((currentMonthExpense - previousMonthExpense) / previousMonthExpense) * 100
      : 0;

  return {
    breakdown,
    currentMonthExpense,
    previousMonthExpense,
    monthOverMonthChange,
    prediction,
    isLoading,
    error,
    refresh: load,
  };
}
