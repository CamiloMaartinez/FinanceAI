// Reúne los datos del informe mensual: lee la base (perfil activo) y arma
// un MonthlyReportData. La lógica de cálculo vive en utils/reportCalculations.

import {
  getAllAccounts,
  getAllCategories,
  getAllDebts,
  getAllGoals,
  getAllSubscriptions,
  getBudgetForMonth,
  getCategoryBreakdown,
  getMonthlyTotals,
  getTopExpensesInRange,
  getTotalBalance,
} from '../../database/db';
import { getActiveProfile } from '../profiles';
import { ACCOUNT_TYPE_LABELS } from '../../constants/accounts';
import { getMonthProgress, projectMonthEnd } from '../../utils/predictionCalculations';
import { getAnnualCost } from '../../utils/subscriptionCalculations';
import {
  buildBudgetRows,
  buildReportInsights,
  getBudgetStatus,
  getPercentChange,
  getSavingsRate,
  type MonthlyReportData,
  type ReportBudget,
  type ReportPrediction,
} from '../../utils/reportCalculations';
import type { BillingFrequency } from '../../models/types';

const TREND_MONTHS = 6;
const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const FREQUENCY_LABELS: Record<BillingFrequency, string> = {
  weekly: 'Semanal',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  annual: 'Anual',
};

/** Informe del mes de `now` (por defecto, el mes en curso). */
export async function loadMonthlyReport(now: Date = new Date()): Promise<MonthlyReportData> {
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 1).toISOString();

  // Últimos 6 meses (el actual al final), para la tendencia y el promedio
  const trendDates = Array.from({ length: TREND_MONTHS }, (_, i) =>
    new Date(year, now.getMonth() - (TREND_MONTHS - 1 - i), 1),
  );

  const [
    profile, rawBreakdown, trendTotals, budget, categories, goals,
    subscriptions, debts, accounts, topExpenses, netWorth,
  ] = await Promise.all([
    getActiveProfile(),
    getCategoryBreakdown(month, year),
    Promise.all(trendDates.map((d) => getMonthlyTotals(d.getMonth() + 1, d.getFullYear()))),
    getBudgetForMonth(month, year),
    getAllCategories(),
    getAllGoals(),
    getAllSubscriptions(),
    getAllDebts(),
    getAllAccounts(),
    getTopExpensesInRange(start, end, 5),
    getTotalBalance(),
  ]);

  const current = trendTotals[TREND_MONTHS - 1];
  const previous = trendTotals[TREND_MONTHS - 2];
  const income = current.income;
  const expense = current.expense;

  const categoryTotal = rawBreakdown.reduce((sum, item) => sum + item.total, 0);
  const reportCategories = rawBreakdown.map((item) => ({
    id: item.categoryId,
    name: item.categoryName,
    color: item.categoryColor,
    total: item.total,
    percentage: categoryTotal > 0 ? (item.total / categoryTotal) * 100 : 0,
  }));

  // Igual que la pantalla de reportes: promedio de los 3 meses anteriores con gasto
  const history = trendTotals.slice(TREND_MONTHS - 4, TREND_MONTHS - 1).map((t) => t.expense).filter((v) => v > 0);
  const { dayOfMonth, daysInMonth } = getMonthProgress(now);
  const prediction: ReportPrediction = {
    projected: projectMonthEnd(expense, dayOfMonth, daysInMonth),
    budgetLimit: budget && budget.totalLimit > 0 ? budget.totalLimit : null,
    historicalAverage: history.length > 0 ? history.reduce((s, v) => s + v, 0) / history.length : null,
    dayOfMonth,
    daysInMonth,
  };

  let reportBudget: ReportBudget | null = null;
  if (budget && budget.totalLimit > 0) {
    const spentById = Object.fromEntries(rawBreakdown.map((b) => [b.categoryId, b.total]));
    const percent = (expense / budget.totalLimit) * 100;
    reportBudget = {
      totalLimit: budget.totalLimit,
      spent: expense,
      percent,
      status: getBudgetStatus(percent),
      rows: buildBudgetRows(budget.categoryLimits, spentById, categories),
    };
  }

  const subscriptionRows = subscriptions.map((s) => ({
    name: s.name,
    color: s.colorHex,
    amount: s.amount,
    frequencyLabel: FREQUENCY_LABELS[s.frequency] ?? 'Mensual',
    monthly: getAnnualCost(s) / 12,
    nextBillingDate: s.nextBillingDate,
  }));
  const subscriptionsMonthly = subscriptionRows.reduce((sum, s) => sum + s.monthly, 0);

  const openDebts = debts.filter((d) => !d.isSettled);
  const savingsRate = getSavingsRate(income, expense);
  const expenseChange = getPercentChange(expense, previous.expense);

  return {
    generatedAt: now.toISOString(),
    periodLabel: now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
    profileName: profile.name,
    income,
    expense,
    net: income - expense,
    savingsRate,
    previousExpense: previous.expense,
    expenseChange,
    netWorth,
    prediction,
    categories: reportCategories,
    trend: trendDates.map((d, i) => ({
      label: MONTH_ABBR[d.getMonth()],
      income: trendTotals[i].income,
      expense: trendTotals[i].expense,
    })),
    budget: reportBudget,
    goals: goals.map((g) => ({
      name: g.name,
      color: g.colorHex,
      current: g.currentAmount,
      target: g.targetAmount,
      percent: g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0,
      targetDate: g.targetDate,
    })),
    subscriptions: subscriptionRows,
    subscriptionsMonthly,
    debts: {
      owedToMe: openDebts.filter((d) => d.direction === 'owed_to_me').reduce((s, d) => s + d.remaining, 0),
      iOwe: openDebts.filter((d) => d.direction === 'i_owe').reduce((s, d) => s + d.remaining, 0),
      openCount: openDebts.length,
    },
    accounts: accounts.map((a) => ({
      name: a.name,
      typeLabel: ACCOUNT_TYPE_LABELS[a.type] ?? 'Cuenta',
      currency: a.currency,
      balance: a.balance,
      color: a.colorHex,
    })),
    topExpenses: topExpenses.map((t) => ({
      date: t.date,
      description: t.notes?.trim() || t.categoryName || 'Gasto',
      categoryName: t.categoryName ?? 'Sin categoría',
      color: t.categoryColor ?? '#D9DAFB',
      amount: t.amount,
    })),
    insights: buildReportInsights({
      income,
      expense,
      savingsRate,
      expenseChange,
      categories: reportCategories,
      prediction,
      budget: reportBudget,
      subscriptionsMonthly,
    }),
  };
}
