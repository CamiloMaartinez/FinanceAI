// Cálculos del informe mensual (PDF). Son funciones puras: reciben los
// datos ya leídos de la base y devuelven lo que el informe muestra. Así se
// pueden probar sin base de datos y la plantilla HTML solo se ocupa de pintar.

import { formatCurrency } from './currency';

export type BudgetStatus = 'ok' | 'warning' | 'over';
export type InsightTone = 'good' | 'warning' | 'info';

export interface ReportCategory {
  id: string;
  name: string;
  color: string;
  total: number;
  /** Porcentaje del gasto del mes (0–100). */
  percentage: number;
}

export interface ReportTrendPoint {
  /** "oct", "nov"... */
  label: string;
  income: number;
  expense: number;
}

export interface ReportBudgetRow {
  categoryName: string;
  color: string;
  spent: number;
  limit: number;
  percent: number;
  status: BudgetStatus;
}

export interface ReportBudget {
  totalLimit: number;
  spent: number;
  percent: number;
  status: BudgetStatus;
  rows: ReportBudgetRow[];
}

export interface ReportGoalRow {
  name: string;
  color: string;
  current: number;
  target: number;
  percent: number;
  targetDate: string;
}

export interface ReportSubscriptionRow {
  name: string;
  color: string;
  amount: number;
  frequencyLabel: string;
  monthly: number;
  nextBillingDate: string;
}

export interface ReportDebts {
  owedToMe: number;
  iOwe: number;
  openCount: number;
}

export interface ReportAccountRow {
  name: string;
  typeLabel: string;
  currency: string;
  balance: number;
  color: string;
}

export interface ReportExpenseRow {
  date: string;
  description: string;
  categoryName: string;
  color: string;
  amount: number;
}

export interface ReportPrediction {
  projected: number;
  budgetLimit: number | null;
  historicalAverage: number | null;
  dayOfMonth: number;
  daysInMonth: number;
}

export interface ReportInsight {
  tone: InsightTone;
  title: string;
  body: string;
}

/** Todo lo que necesita la plantilla del informe. */
export interface MonthlyReportData {
  generatedAt: string;
  /** "octubre de 2026" */
  periodLabel: string;
  profileName: string;
  income: number;
  expense: number;
  net: number;
  /** Ahorro / ingresos en %, o null si no hubo ingresos. */
  savingsRate: number | null;
  previousExpense: number;
  /** Variación del gasto vs. el mes anterior en %, o null sin datos. */
  expenseChange: number | null;
  netWorth: number;
  prediction: ReportPrediction | null;
  categories: ReportCategory[];
  trend: ReportTrendPoint[];
  budget: ReportBudget | null;
  goals: ReportGoalRow[];
  subscriptions: ReportSubscriptionRow[];
  subscriptionsMonthly: number;
  debts: ReportDebts;
  accounts: ReportAccountRow[];
  topExpenses: ReportExpenseRow[];
  insights: ReportInsight[];
}

// ─── Indicadores ────────────────────────────────────────────

export function getSavingsRate(income: number, expense: number): number | null {
  if (income <= 0) return null;
  return ((income - expense) / income) * 100;
}

export function getPercentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

/** Mismo semáforo que la pantalla de presupuestos: 80 % avisa, 100 % se pasó. */
export function getBudgetStatus(percent: number): BudgetStatus {
  if (percent >= 100) return 'over';
  if (percent >= 80) return 'warning';
  return 'ok';
}

export function buildBudgetRows(
  categoryLimits: Record<string, number>,
  spentByCategory: Record<string, number>,
  categories: { id: string; name: string; colorHex: string }[],
): ReportBudgetRow[] {
  const byId = new Map(categories.map((cat) => [cat.id, cat]));
  return Object.entries(categoryLimits)
    .filter(([, limit]) => limit > 0)
    .map(([id, limit]) => {
      const spent = spentByCategory[id] ?? 0;
      const percent = (spent / limit) * 100;
      const cat = byId.get(id);
      return {
        categoryName: cat?.name ?? 'Categoría',
        color: cat?.colorHex ?? '#D9DAFB',
        spent,
        limit,
        percent,
        status: getBudgetStatus(percent),
      };
    })
    .sort((a, b) => b.percent - a.percent);
}

// ─── Hallazgos ──────────────────────────────────────────────
// Frases cortas con lo más importante del mes, en el tono de la app
// (directo, en segunda persona). Se ordenan: primero lo que pide atención.

const MAX_INSIGHTS = 5;

export function buildReportInsights(data: {
  income: number;
  expense: number;
  savingsRate: number | null;
  expenseChange: number | null;
  categories: ReportCategory[];
  prediction: ReportPrediction | null;
  budget: ReportBudget | null;
  subscriptionsMonthly: number;
}): ReportInsight[] {
  const out: ReportInsight[] = [];
  const pct = (n: number) => `${Math.round(Math.abs(n))}%`;

  if (data.income > 0 || data.expense > 0) {
    const net = data.income - data.expense;
    if (net >= 0 && data.savingsRate !== null) {
      out.push({
        tone: data.savingsRate >= 10 ? 'good' : 'info',
        title: `Ahorraste ${pct(data.savingsRate)} de tus ingresos`,
        body: `Te quedaron ${formatCurrency(net)} libres este mes.`,
      });
    } else if (net < 0) {
      out.push({
        tone: 'warning',
        title: 'Gastaste más de lo que ingresó',
        body: `La diferencia fue de ${formatCurrency(-net)}. Revisa las categorías más altas.`,
      });
    }
  }

  if (data.expenseChange !== null && Math.abs(data.expenseChange) >= 5) {
    const up = data.expenseChange > 0;
    out.push({
      tone: up ? 'warning' : 'good',
      title: up
        ? `Tu gasto subió ${pct(data.expenseChange)} frente al mes anterior`
        : `Tu gasto bajó ${pct(data.expenseChange)} frente al mes anterior`,
      body: up ? 'Mira qué categorías crecieron en la tabla de abajo.' : 'Buen trabajo: mantén el ritmo.',
    });
  }

  const p = data.prediction;
  if (p && p.budgetLimit) {
    const diff = p.projected - p.budgetLimit;
    out.push(
      diff > 0
        ? {
            tone: 'warning',
            title: 'A este ritmo superarás tu presupuesto',
            body: `Terminarías en ${formatCurrency(p.projected)}, ${formatCurrency(diff)} por encima del límite.`,
          }
        : {
            tone: 'good',
            title: 'Vas dentro de tu presupuesto',
            body: `Proyección de cierre: ${formatCurrency(p.projected)} de ${formatCurrency(p.budgetLimit)}.`,
          },
    );
  }

  const over = data.budget?.rows.filter((r) => r.status === 'over') ?? [];
  if (over.length > 0) {
    const names = over.slice(0, 3).map((r) => r.categoryName).join(', ');
    out.push({
      tone: 'warning',
      title: over.length === 1 ? 'Te pasaste en 1 categoría' : `Te pasaste en ${over.length} categorías`,
      body: `${names}.`,
    });
  }

  const top = data.categories[0];
  if (top && top.percentage > 0) {
    out.push({
      tone: 'info',
      title: `${top.name} es tu mayor gasto`,
      body: `Se llevó ${pct(top.percentage)} de lo que gastaste (${formatCurrency(top.total)}).`,
    });
  }

  if (data.subscriptionsMonthly > 0) {
    const share = data.income > 0 ? ` (${pct((data.subscriptionsMonthly / data.income) * 100)} de tus ingresos)` : '';
    out.push({
      tone: 'info',
      title: `Tus suscripciones cuestan ${formatCurrency(data.subscriptionsMonthly)} al mes`,
      body: `Es lo que pagas en promedio cada mes${share}.`,
    });
  }

  const order: Record<InsightTone, number> = { warning: 0, good: 1, info: 2 };
  return out
    .map((insight, i) => ({ insight, i }))
    .sort((a, b) => order[a.insight.tone] - order[b.insight.tone] || a.i - b.i)
    .slice(0, MAX_INSIGHTS)
    .map(({ insight }) => insight);
}
