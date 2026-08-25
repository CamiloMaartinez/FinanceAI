import * as Notifications from 'expo-notifications';
import {
  getAllAlerts,
  getTotalBalance,
  getMonthlyTotals,
  getCategoryBreakdown,
  getAllGoals,
  updateAlertTriggered,
} from '../database/db';

interface AlertRule {
  id: string;
  title: string;
  type: string;
  condition: string;
  threshold: number;
  categoryId: string | null;
  lastTriggered: string | null;
}

// Evita enviar la misma alerta más de una vez por día
function wasTriggeredToday(lastTriggered: string | null): boolean {
  if (!lastTriggered) return false;
  const last = new Date(lastTriggered);
  const now  = new Date();
  return (
    last.getDate()     === now.getDate() &&
    last.getMonth()    === now.getMonth() &&
    last.getFullYear() === now.getFullYear()
  );
}

async function sendAlert(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null, // Envía inmediatamente
  });
}

export async function evaluateAlerts(): Promise<void> {
  try {
    const alerts = await getAllAlerts() as AlertRule[];
    if (alerts.length === 0) return;

    const now          = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear  = now.getFullYear();

    // Datos financieros actuales
    const [balance, totals, breakdown, goals] = await Promise.all([
      getTotalBalance(),
      getMonthlyTotals(currentMonth, currentYear),
      getCategoryBreakdown(currentMonth, currentYear),
      getAllGoals(),
    ]);

    for (const alert of alerts) {
      if (wasTriggeredToday(alert.lastTriggered)) continue;

      let triggered = false;
      let body      = '';

      switch (alert.type) {
        case 'balance_below':
          if (balance < alert.threshold) {
            triggered = true;
            body = `Tu saldo total es $${Math.round(balance).toLocaleString('es-CO')}, por debajo del límite de $${Math.round(alert.threshold).toLocaleString('es-CO')}.`;
          }
          break;

        case 'monthly_expense_above':
          if (totals.expense > alert.threshold) {
            triggered = true;
            body = `Llevas $${Math.round(totals.expense).toLocaleString('es-CO')} en gastos este mes, superando el límite de $${Math.round(alert.threshold).toLocaleString('es-CO')}.`;
          }
          break;

        case 'category_expense_above':
          if (alert.categoryId) {
            const cat = breakdown.find((b: any) => b.categoryId === alert.categoryId);
            if (cat && cat.total > alert.threshold) {
              triggered = true;
              body = `Gastaste $${Math.round(cat.total).toLocaleString('es-CO')} en ${cat.categoryName}, superando el límite de $${Math.round(alert.threshold).toLocaleString('es-CO')}.`;
            }
          }
          break;

        case 'goal_progress':
          for (const goal of goals as any[]) {
            const progress = goal.targetAmount > 0
              ? (goal.currentAmount / goal.targetAmount) * 100
              : 0;
            if (progress >= alert.threshold) {
              triggered = true;
              body = `Tu meta "${goal.name}" alcanzó el ${Math.round(progress)}% de progreso.`;
              break;
            }
          }
          break;

        case 'savings_rate_below':
          const savingsRate = totals.income > 0
            ? ((totals.income - totals.expense) / totals.income) * 100
            : 0;
          if (savingsRate < alert.threshold) {
            triggered = true;
            body = `Tu tasa de ahorro este mes es ${savingsRate.toFixed(1)}%, por debajo del ${alert.threshold}% que definiste.`;
          }
          break;
      }

      if (triggered) {
        await sendAlert(alert.title, body);
        await updateAlertTriggered(alert.id);
      }
    }
  } catch (err) {
    console.error('Error evaluando alertas:', err);
  }
}