import { useState, useCallback, useEffect } from 'react';
import { getCategoryBreakdown, getMonthlyTotals } from '../database/db';

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  total: number;
  percentage: number;
}

interface UseReportsResult {
  breakdown: CategoryBreakdownItem[];
  currentMonthExpense: number;
  previousMonthExpense: number;
  monthOverMonthChange: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useReports(): UseReportsResult {
  const [breakdown,             setBreakdown]             = useState<CategoryBreakdownItem[]>([]);
  const [currentMonthExpense,   setCurrentMonthExpense]   = useState(0);
  const [previousMonthExpense,  setPreviousMonthExpense]  = useState(0);
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

      const [rawBreakdown, currentTotals, previousTotals] = await Promise.all([
        getCategoryBreakdown(currentMonth, currentYear),
        getMonthlyTotals(currentMonth, currentYear),
        getMonthlyTotals(prevMonth, prevYear),
      ]);

      const totalExpense = rawBreakdown.reduce((sum, item) => sum + item.total, 0);

      const breakdownWithPercentage: CategoryBreakdownItem[] = rawBreakdown.map((item) => ({
        ...item,
        percentage: totalExpense > 0 ? (item.total / totalExpense) * 100 : 0,
      }));

      setBreakdown(breakdownWithPercentage);
      setCurrentMonthExpense(currentTotals.expense);
      setPreviousMonthExpense(previousTotals.expense);
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
    isLoading,
    error,
    refresh: load,
  };
}