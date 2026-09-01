import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAllAlerts,
  getTotalBalance,
  getMonthlyTotals,
  getCategoryBreakdown,
  getAllGoals,
  getBudgetForMonth,
  getAllCategories,
  updateAlertTriggered,
} from '../database/db';

const BUDGET_NOTIFIED_KEY = 'budget-alerts-notified';
const UNUSUAL_NOTIFIED_KEY = 'unusual-spending-notified';

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

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// Revisa el presupuesto del mes y avisa cuando el total o alguna categoría
// llega al 80% de su límite. Como el presupuesto no tiene un "lastTriggered"
// por categoría (a diferencia de las alertas manuales), usamos AsyncStorage
// para no repetir el mismo aviso más de una vez por día.
async function evaluateBudgetAlerts(): Promise<void> {
  const now          = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear  = now.getFullYear();

  const budget = await getBudgetForMonth(currentMonth, currentYear);
  if (!budget) return;

  const [totals, breakdown, categories] = await Promise.all([
    getMonthlyTotals(currentMonth, currentYear),
    getCategoryBreakdown(currentMonth, currentYear),
    getAllCategories(),
  ]);

  const notifiedRaw = await AsyncStorage.getItem(BUDGET_NOTIFIED_KEY);
  const notified: Record<string, string> = notifiedRaw ? JSON.parse(notifiedRaw) : {};
  const today = todayKey();

  const toNotify: { key: string; title: string; body: string }[] = [];

  // Total del mes
  if (budget.totalLimit > 0) {
    const percent = (totals.expense / budget.totalLimit) * 100;
    const key = `total-${currentYear}-${currentMonth}`;
    if (percent >= 80 && notified[key] !== today) {
      toNotify.push({
        key,
        title: percent >= 100 ? 'Superaste tu presupuesto' : 'Cerca de tu límite mensual',
        body: `Llevas $${Math.round(totals.expense).toLocaleString('es-CO')} de $${Math.round(budget.totalLimit).toLocaleString('es-CO')} (${Math.round(percent)}%).`,
      });
    }
  }

  // Por categoría
  for (const [categoryId, limit] of Object.entries(budget.categoryLimits)) {
    if (limit <= 0) continue;
    const spent = breakdown.find((b) => b.categoryId === categoryId)?.total ?? 0;
    const percent = (spent / limit) * 100;
    const key = `cat-${categoryId}-${currentYear}-${currentMonth}`;

    if (percent >= 80 && notified[key] !== today) {
      const catName = categories.find((c) => c.id === categoryId)?.name ?? 'esa categoría';
      toNotify.push({
        key,
        title: percent >= 100 ? `Superaste el presupuesto de ${catName}` : `Cerca del límite en ${catName}`,
        body: `Llevas $${Math.round(spent).toLocaleString('es-CO')} de $${Math.round(limit).toLocaleString('es-CO')} (${Math.round(percent)}%).`,
      });
    }
  }

  if (toNotify.length === 0) return;

  for (const n of toNotify) {
    await sendAlert(n.title, n.body);
    notified[n.key] = today;
  }
  await AsyncStorage.setItem(BUDGET_NOTIFIED_KEY, JSON.stringify(notified));
}

// Devuelve { mes, año } retrocediendo `monthsAgo` meses desde hoy
function getPastMonth(monthsAgo: number): { month: number; year: number } {
  const d = new Date();
  d.setDate(1); // evita saltos raros de días al restar meses
  d.setMonth(d.getMonth() - monthsAgo);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

// Compara el gasto de este mes por categoría contra el promedio de los
// últimos 3 meses en esa misma categoría. Si vas muy por encima de tu propio
// comportamiento histórico, avisa — una vez al día por categoría como máximo.
async function evaluateUnusualSpending(): Promise<void> {
  const now          = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear  = now.getFullYear();

  const [currentBreakdown, categories, ...pastBreakdowns] = await Promise.all([
    getCategoryBreakdown(currentMonth, currentYear),
    getAllCategories(),
    ...[1, 2, 3].map((n) => {
      const { month, year } = getPastMonth(n);
      return getCategoryBreakdown(month, year);
    }),
  ]);

  if (currentBreakdown.length === 0) return;

  const notifiedRaw = await AsyncStorage.getItem(UNUSUAL_NOTIFIED_KEY);
  const notified: Record<string, string> = notifiedRaw ? JSON.parse(notifiedRaw) : {};
  const today = todayKey();

  const toNotify: { key: string; title: string; body: string }[] = [];

  for (const current of currentBreakdown) {
    // Historial de esta categoría en los 3 meses anteriores (solo meses con gasto real)
    const history = pastBreakdowns
      .map((b) => b.find((x) => x.categoryId === current.categoryId)?.total ?? 0)
      .filter((amount) => amount > 0);

    // Necesitamos al menos 2 meses de referencia para no disparar falsos
    // positivos con categorías nuevas o de uso muy esporádico
    if (history.length < 2) continue;

    const average = history.reduce((sum, v) => sum + v, 0) / history.length;
    const increase = current.total - average;

    // Al menos 60% más que tu promedio, y que la diferencia no sea insignificante
    const isUnusual = average > 0 && current.total >= average * 1.6 && increase >= 25000;

    const key = `${current.categoryId}-${currentYear}-${currentMonth}`;
    if (isUnusual && notified[key] !== today) {
      const percentOver = Math.round((current.total / average - 1) * 100);
      toNotify.push({
        key,
        title: `Gasto inusual en ${current.categoryName}`,
        body: `Llevas $${Math.round(current.total).toLocaleString('es-CO')} este mes, ${percentOver}% más que tu promedio habitual de $${Math.round(average).toLocaleString('es-CO')}.`,
      });
    }
  }

  if (toNotify.length === 0) return;

  for (const n of toNotify) {
    await sendAlert(n.title, n.body);
    notified[n.key] = today;
  }
  await AsyncStorage.setItem(UNUSUAL_NOTIFIED_KEY, JSON.stringify(notified));
}

export async function evaluateAlerts(): Promise<void> {
  try {
    await evaluateBudgetAlerts();
    await evaluateUnusualSpending();

    const alerts = await getAllAlerts();
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
            const cat = breakdown.find((b) => b.categoryId === alert.categoryId);
            if (cat && cat.total > alert.threshold) {
              triggered = true;
              body = `Gastaste $${Math.round(cat.total).toLocaleString('es-CO')} en ${cat.categoryName}, superando el límite de $${Math.round(alert.threshold).toLocaleString('es-CO')}.`;
            }
          }
          break;

        case 'goal_progress':
          for (const goal of goals) {
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