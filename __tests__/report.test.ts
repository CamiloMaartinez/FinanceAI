import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  buildBudgetRows,
  buildReportInsights,
  getBudgetStatus,
  getPercentChange,
  getSavingsRate,
  type MonthlyReportData,
} from '../src/utils/reportCalculations';
import { buildReportHtml, escapeHtml } from '../src/services/report/reportHtml';
import { mascotSvg } from '../src/components/mascot/mascotSvg';
import { MASCOT_POSES } from '../src/components/mascot/poses';
import type * as DbModule from '../src/database/db';

export const sampleReport = (overrides: Partial<MonthlyReportData> = {}): MonthlyReportData => ({
  generatedAt: new Date(2026, 9, 18, 12).toISOString(),
  periodLabel: 'octubre de 2026',
  profileName: 'Camilo',
  income: 4_100_000,
  expense: 2_759_800,
  net: 1_340_200,
  savingsRate: 32.7,
  previousExpense: 1_960_000,
  expenseChange: 40.8,
  netWorth: 15_240_200,
  prediction: { projected: 4_752_989, budgetLimit: 3_000_000, historicalAverage: 1_790_000, dayOfMonth: 18, daysInMonth: 31 },
  categories: [
    { id: 'cat-hogar', name: 'Hogar', color: '#CDEFD9', total: 1_780_000, percentage: 64.5 },
    { id: 'cat-alimentacion', name: 'Alimentación', color: '#F8C98F', total: 319_000, percentage: 11.6 },
    { id: 'cat-educacion', name: 'Educación', color: '#D9DAFB', total: 250_000, percentage: 9.1 },
    { id: 'cat-salud', name: 'Salud', color: '#F9C9C0', total: 120_000, percentage: 4.3 },
    { id: 'cat-mascotas', name: 'Mascotas', color: '#F8C98F', total: 95_000, percentage: 3.4 },
    { id: 'cat-transporte', name: 'Transporte', color: '#CDEEF7', total: 74_000, percentage: 2.7 },
    { id: 'cat-entretenimiento', name: 'Entretenimiento', color: '#FBDDE6', total: 65_000, percentage: 2.4 },
    { id: 'cat-suscripciones', name: 'Suscripciones', color: '#E8D5F7', total: 56_800, percentage: 2.1 },
  ],
  trend: [
    { label: 'may', income: 3_800_000, expense: 1_700_000 },
    { label: 'jun', income: 3_900_000, expense: 1_850_000 },
    { label: 'jul', income: 3_800_000, expense: 2_100_000 },
    { label: 'ago', income: 4_000_000, expense: 1_650_000 },
    { label: 'sep', income: 3_950_000, expense: 1_960_000 },
    { label: 'oct', income: 4_100_000, expense: 2_759_800 },
  ],
  budget: {
    totalLimit: 3_000_000, spent: 2_759_800, percent: 92, status: 'warning',
    rows: [
      { categoryName: 'Hogar', color: '#CDEFD9', spent: 1_780_000, limit: 1_500_000, percent: 118.7, status: 'over' },
      { categoryName: 'Alimentación', color: '#F8C98F', spent: 319_000, limit: 400_000, percent: 79.8, status: 'ok' },
    ],
  },
  goals: [{ name: 'Viaje a Cartagena', color: '#6B3FC9', current: 1_200_000, target: 3_000_000, percent: 40, targetDate: new Date(2027, 5, 1).toISOString() }],
  subscriptions: [
    { name: 'Spotify', color: '#1F5A3D', amount: 16_900, frequencyLabel: 'Mensual', monthly: 16_900, nextBillingDate: new Date(2026, 9, 25).toISOString() },
    { name: 'Netflix', color: '#6E1F3A', amount: 39_900, frequencyLabel: 'Mensual', monthly: 39_900, nextBillingDate: new Date(2026, 10, 2).toISOString() },
  ],
  subscriptionsMonthly: 56_800,
  debts: { owedToMe: 150_000, iOwe: 0, openCount: 1 },
  accounts: [
    { name: 'Bancolombia', typeLabel: 'Cuenta corriente', currency: 'COP', balance: 7_211_100, color: '#F8C98F' },
    { name: 'Nu Colombia', typeLabel: 'Ahorros', currency: 'COP', balance: 4_200_000, color: '#6B3FC9' },
    { name: 'Nequi', typeLabel: 'Billetera digital', currency: 'COP', balance: 353_100, color: '#CDEFD9' },
  ],
  topExpenses: [
    { date: new Date(2026, 9, 1).toISOString(), description: 'Arriendo', categoryName: 'Hogar', color: '#CDEFD9', amount: 1_500_000 },
    { date: new Date(2026, 9, 5).toISOString(), description: 'Matrícula curso', categoryName: 'Educación', color: '#D9DAFB', amount: 250_000 },
  ],
  insights: [],
  ...overrides,
});

describe('cálculos del informe', () => {
  it('tasa de ahorro y variación', () => {
    expect(getSavingsRate(1_000, 750)).toBeCloseTo(25);
    expect(getSavingsRate(0, 500)).toBeNull();
    expect(getPercentChange(150, 100)).toBeCloseTo(50);
    expect(getPercentChange(150, 0)).toBeNull();
  });

  it('semáforo de presupuesto igual al de la app (80 / 100)', () => {
    expect(getBudgetStatus(79.9)).toBe('ok');
    expect(getBudgetStatus(80)).toBe('warning');
    expect(getBudgetStatus(100)).toBe('over');
  });

  it('arma las filas de presupuesto ordenadas por uso', () => {
    const rows = buildBudgetRows(
      { a: 100, b: 200, c: 0 },
      { a: 50, b: 260 },
      [{ id: 'a', name: 'Comida', colorHex: '#F8C98F' }, { id: 'b', name: 'Hogar', colorHex: '#CDEFD9' }],
    );
    expect(rows.map((r) => r.categoryName)).toEqual(['Hogar', 'Comida']);
    expect(rows[0].status).toBe('over');
  });

  it('los hallazgos ponen primero lo que pide atención', () => {
    const d = sampleReport();
    const insights = buildReportInsights({ ...d, budget: d.budget });
    expect(insights.length).toBeLessThanOrEqual(5);
    expect(insights[0].tone).toBe('warning');
    expect(insights.some((i) => i.title.includes('Hogar'))).toBe(true);
  });

  it('sin movimientos no inventa hallazgos', () => {
    expect(buildReportInsights({
      income: 0, expense: 0, savingsRate: null, expenseChange: null, categories: [],
      prediction: null, budget: null, subscriptionsMonthly: 0,
    })).toEqual([]);
  });
});

describe('plantilla del informe', () => {
  it('lleva la marca: logo, colores y a Moni', () => {
    const html = buildReportHtml(sampleReport());
    expect(html).toContain('data:image/png;base64,');
    expect(html).toContain('FINANZAS DE ALTURA');
    expect(html).toContain('#2E1A78');
    expect(html).toContain('Moni saludando');
    expect(html).toContain('Tendencia de 6 meses');
  });

  it('escapa lo que escribe el usuario', () => {
    expect(escapeHtml('<b>"x" & y</b>')).toBe('&lt;b&gt;&quot;x&quot; &amp; y&lt;/b&gt;');
    const html = buildReportHtml(sampleReport({ profileName: '<script>alert(1)</script>' }));
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('un mes vacío muestra estados vacíos en vez de tablas', () => {
    const html = buildReportHtml(sampleReport({
      income: 0, expense: 0, net: 0, savingsRate: null, categories: [], budget: null,
      goals: [], subscriptions: [], subscriptionsMonthly: 0, topExpenses: [], insights: [],
    }));
    expect(html).toContain('Aún no hay gastos registrados este mes.');
    expect(html).not.toContain('Tus gastos más grandes');
  });

  it('Moni se dibuja en todas sus poses', () => {
    for (const pose of MASCOT_POSES) {
      expect(mascotSvg(pose)).toMatch(/^<svg[\s\S]*<\/svg>$/);
    }
  });
});

describe('datos del informe (base de datos real en memoria)', () => {
  let db: typeof DbModule;
  beforeEach(() => {
    jest.resetModules();
    db = require('../src/database/db');
  });

  it('reúne totales, categorías, presupuesto y gastos más grandes del mes', async () => {
    const { loadMonthlyReport } = require('../src/services/report/reportData');
    await db.createAccount('Ahorros', 'savings', 1_000_000, '#00f', 'wallet');
    const hogar = await db.insertCategory({ name: 'Hogar', iconName: 'hogar', colorHex: '#CDEFD9' });
    const comida = await db.insertCategory({ name: 'Comida', iconName: 'comida', colorHex: '#F8C98F' });
    const [account] = await db.getAllAccounts();
    const now = new Date(2026, 9, 15, 12);
    const on = (d: number) => new Date(2026, 9, d, 12).toISOString();
    const base = { accountId: account.id, toAccountId: null, notes: '' };
    await db.createTransaction({ ...base, amount: 4_000_000, type: 'income', date: on(1), categoryId: null });
    await db.createTransaction({ ...base, amount: 1_500_000, type: 'expense', date: on(2), categoryId: hogar, notes: 'Arriendo' });
    await db.createTransaction({ ...base, amount: 300_000, type: 'expense', date: on(3), categoryId: comida });
    await db.upsertBudget(10, 2026, 2_000_000, { [hogar]: 1_000_000 });

    const report = await loadMonthlyReport(now);
    expect(report.income).toBe(4_000_000);
    expect(report.expense).toBe(1_800_000);
    expect(report.savingsRate).toBeCloseTo(55);
    expect(report.categories[0]).toMatchObject({ id: hogar, name: 'Hogar', total: 1_500_000 });
    expect(report.trend).toHaveLength(6);
    expect(report.trend[5].label).toBe('oct');
    expect(report.budget?.rows[0]).toMatchObject({ categoryName: 'Hogar', status: 'over' });
    expect(report.topExpenses[0]).toMatchObject({ description: 'Arriendo', amount: 1_500_000 });
    expect(report.insights.length).toBeGreaterThan(0);
  });
});

if (process.env.REPORT_PREVIEW) {
  it('escribe la vista previa', () => {
    const d = sampleReport();
    d.insights = buildReportInsights({ ...d });
    require('fs').writeFileSync(process.env.REPORT_PREVIEW as string, buildReportHtml(d));
  });
}
