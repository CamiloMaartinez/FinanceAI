import { useState, useCallback, useEffect } from 'react';
import {
  getAllAlerts,
  createAlert,
  deleteAlert,
} from '../database/db';

export interface Alert {
  id: string;
  title: string;
  type: AlertType;
  condition: string;
  threshold: number;
  categoryId: string | null;
  isActive: boolean;
  lastTriggered: string | null;
  createdAt: string;
}

export type AlertType =
  | 'balance_below'
  | 'monthly_expense_above'
  | 'category_expense_above'
  | 'goal_progress'
  | 'savings_rate_below';

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  balance_below:          'Saldo por debajo de',
  monthly_expense_above:  'Gastos del mes superan',
  category_expense_above: 'Gasto en categoría supera',
  goal_progress:          'Meta alcanza el progreso de',
  savings_rate_below:     'Tasa de ahorro menor a',
};

export const ALERT_TYPE_UNITS: Record<AlertType, string> = {
  balance_below:          '$',
  monthly_expense_above:  '$',
  category_expense_above: '$',
  goal_progress:          '%',
  savings_rate_below:     '%',
};

interface UseAlertsResult {
  alerts: Alert[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addAlert: (
    title: string,
    type: AlertType,
    condition: string,
    threshold: number,
    categoryId: string | null
  ) => Promise<void>;
  removeAlert: (id: string) => Promise<void>;
}

export function useAlerts(): UseAlertsResult {
  const [alerts,    setAlerts]    = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await getAllAlerts();
      setAlerts(rows as Alert[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando alertas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addAlert = useCallback(async (
    title: string,
    type: AlertType,
    condition: string,
    threshold: number,
    categoryId: string | null
  ) => {
    await createAlert(title, type, condition, threshold, categoryId);
    await load();
  }, [load]);

  const removeAlert = useCallback(async (id: string) => {
    await deleteAlert(id);
    await load();
  }, [load]);

  return {
    alerts,
    isLoading,
    error,
    refresh: load,
    addAlert,
    removeAlert,
  };
}