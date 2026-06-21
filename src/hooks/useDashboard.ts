import { useState, useCallback, useEffect } from 'react';
import { getTotalBalance, getMonthlyTotals, getRecentTransactions } from '../database/db';
import type { DashboardData, MonthlyChartPoint } from '../models/types';

const MONTH_NAMES = [
  'Ene','Feb','Mar','Abr','May',
  'Jun','Jul','Ago','Sep','Oct','Nov','Dic'
];

export function useDashboard(): DashboardData {
  const [totalBalance,       setTotalBalance]       = useState(0);
  const [monthlyIncome,      setMonthlyIncome]      = useState(0);
  const [monthlyExpenses,    setMonthlyExpenses]    = useState(0);
  const [monthlyChart,       setMonthlyChart]       = useState<MonthlyChartPoint[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<DashboardData['recentTransactions']>([]);
  const [isLoading,          setIsLoading]          = useState(true);
  const [error,              setError]              = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const now          = new Date();
      const currentMonth = now.getMonth() + 1; // getMonth() devuelve 0-11
      const currentYear  = now.getFullYear();

      // Saldo total de todas las cuentas
      const balance = await getTotalBalance();
      setTotalBalance(balance);

      // Ingresos y gastos del mes actual
      const { income, expense } = await getMonthlyTotals(currentMonth, currentYear);
      setMonthlyIncome(income);
      setMonthlyExpenses(expense);

      // Últimas 5 transacciones
      const recent = await getRecentTransactions(5);
      setRecentTransactions(recent);

      // Gráfica: datos de los últimos 6 meses
      const chartData: MonthlyChartPoint[] = [];

      for (let offset = 5; offset >= 0; offset--) {
        // Calculamos el mes correcto hacia atrás
        const date = new Date(currentYear, now.getMonth() - offset, 1);
        const m    = date.getMonth() + 1;
        const y    = date.getFullYear();

        const totals = await getMonthlyTotals(m, y);

        chartData.push({
          month:   MONTH_NAMES[date.getMonth()],
          income:  totals.income,
          expense: totals.expense,
        });
      }

      setMonthlyChart(chartData);

    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error cargando datos'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carga los datos automáticamente cuando el componente aparece
  useEffect(() => {
    load();
  }, [load]);

  const monthlyNet    = monthlyIncome - monthlyExpenses;
  const savingsRate   = monthlyIncome > 0
    ? (monthlyNet / monthlyIncome) * 100
    : 0;

  return {
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    monthlyNet,
    savingsRate,
    monthlyChart,
    recentTransactions,
    isLoading,
    error,
    refresh: load,
  };
}