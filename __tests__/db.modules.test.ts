import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type * as DbModule from '../src/database/db';

let db: typeof DbModule;
const iso = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).toISOString();

beforeEach(() => {
  jest.resetModules();
  db = require('../src/database/db');
});

describe('metas de ahorro', () => {
  it('suma los aportes y se marca completada al llegar al objetivo', async () => {
    await db.createGoal('Viaje', 1_000_000, iso(2027, 1, 1), 'high', '#00f', 'airplane');
    const [goal] = await db.getAllGoals();

    await db.contributeToGoal(goal.id, 400_000);
    expect((await db.getAllGoals())[0].currentAmount).toBe(400_000);

    await db.contributeToGoal(goal.id, 600_000);
    // getAllGoals solo devuelve las activas: la completada ya no aparece
    expect(await db.getAllGoals()).toHaveLength(0);
    expect((await db.getGlobalStats()).completedGoals).toBe(1);
  });

  it('se puede editar y borrar', async () => {
    await db.createGoal('Carro', 20_000_000, iso(2028, 1, 1), 'low', '#f00', 'car');
    const [goal] = await db.getAllGoals();
    await db.updateGoal(goal.id, 'Moto', 8_000_000, iso(2027, 6, 1), 'medium', '#0f0', 'bicycle');
    expect((await db.getAllGoals())[0]).toMatchObject({ name: 'Moto', targetAmount: 8_000_000 });
    await db.deleteGoal(goal.id);
    expect(await db.getAllGoals()).toHaveLength(0);
  });
});

describe('presupuestos', () => {
  it('guardar dos veces el mismo mes actualiza en vez de duplicar', async () => {
    await db.upsertBudget(10, 2026, 2_000_000, { 'cat-food': 600_000 });
    await db.upsertBudget(10, 2026, 2_500_000, { 'cat-food': 700_000 }, true);

    const budget = await db.getBudgetForMonth(10, 2026);
    expect(budget).toMatchObject({ totalLimit: 2_500_000, categoryLimits: { 'cat-food': 700_000 } });
    expect(budget?.isAIGenerated).toBeTruthy();
    expect(await db.getBudgetForMonth(11, 2026)).toBeNull();
  });
});

describe('tarjetas', () => {
  it('guardan los beneficios y las favoritas van primero', async () => {
    await db.createCard('Clásica', 'Banco A', 0, 0, 2.1, [], '#888');
    await db.createCard('Platino', 'Banco B', 300_000, 1.5, 2.3, ['Salas VIP', 'Seguro de viaje'], '#333');
    const platino = (await db.getAllCards()).find((c) => c.name === 'Platino')!;
    expect(platino.benefits).toEqual(['Salas VIP', 'Seguro de viaje']);

    await db.toggleFavoriteCard(platino.id, true);
    expect((await db.getAllCards())[0].name).toBe('Platino');
  });
});

describe('alertas y retos', () => {
  it('una alerta registra cuándo se disparó y se puede borrar', async () => {
    await db.createAlert('Mucho en comida', 'category_limit', 'greater_than', 500_000, 'cat-food');
    const [alert] = await db.getAllAlerts();
    await db.updateAlertTriggered(alert.id);
    expect((await db.getAllAlerts())[0].lastTriggered).toBeTruthy();
    await db.deleteAlert(alert.id);
    expect(await db.getAllAlerts()).toHaveLength(0);
  });

  it('un reto cambia de estado', async () => {
    await db.createChallenge('Sin domicilios', 'Un mes sin pedir comida', 'cat-food', iso(2026, 10, 1), iso(2026, 10, 31));
    const [challenge] = await db.getAllChallenges();
    expect(challenge.status).toBe('active');
    await db.updateChallengeStatus(challenge.id, 'completed');
    expect((await db.getAllChallenges())[0].status).toBe('completed');
  });
});

describe('gasto por categoría en un rango', () => {
  it('suma gastos y pagos de la categoría, sin ingresos, transferencias ni fechas fuera', async () => {
    await db.createAccount('Ahorros', 'savings', 1_000_000, '#00f', 'wallet');
    await db.createAccount('Nequi', 'digital', 0, '#f0f', 'phone');
    const [a, b] = await db.getAllAccounts();
    const base = { toAccountId: null, notes: '' };

    await db.createTransaction({ ...base, type: 'expense', amount: 30_000, accountId: a.id, categoryId: 'cat-food', date: iso(2026, 10, 5) });
    await db.createTransaction({ ...base, type: 'payment', amount: 20_000, accountId: a.id, categoryId: 'cat-food', date: iso(2026, 10, 6) });
    await db.createTransaction({ ...base, type: 'expense', amount: 99_000, accountId: a.id, categoryId: 'cat-food', date: iso(2026, 9, 30) });
    await db.createTransaction({ ...base, type: 'expense', amount: 50_000, accountId: a.id, categoryId: 'cat-fun', date: iso(2026, 10, 7) });
    await db.createTransaction({ ...base, type: 'transfer', amount: 70_000, accountId: a.id, toAccountId: b.id, categoryId: null, date: iso(2026, 10, 8) });

    expect(await db.getCategorySpentInRange('cat-food', iso(2026, 10, 1), iso(2026, 11, 1))).toBe(50_000);
  });
});

describe('movimientos antiguos (préstamo, pago, inversión)', () => {
  it('un préstamo recibido suma al saldo y un pago resta', async () => {
    await db.createAccount('Ahorros', 'savings', 100_000, '#00f', 'wallet');
    const [acc] = await db.getAllAccounts();
    const base = { toAccountId: null, categoryId: null, notes: '', date: iso(2026, 10, 1) };
    await db.createTransaction({ ...base, type: 'loan', amount: 500_000, accountId: acc.id });
    await db.createTransaction({ ...base, type: 'payment', amount: 50_000, accountId: acc.id });
    expect((await db.getAllAccounts())[0].balance).toBe(550_000);
  });

  it('editar un pago conserva su categoría (cuenta en los reportes por categoría)', async () => {
    await db.createAccount('Ahorros', 'savings', 100_000, '#00f', 'wallet');
    const [acc] = await db.getAllAccounts();
    await db.createTransaction({ type: 'payment', amount: 40_000, accountId: acc.id, toAccountId: null,
      categoryId: 'cat-home', notes: 'Cuota', date: iso(2026, 10, 1) });
    const [tx] = await db.getAllTransactionsWithCategory();

    await db.updateTransaction(
      tx.id,
      { amount: tx.amount, type: tx.type, accountId: tx.accountId, toAccountId: null },
      { type: 'payment', amount: 45_000, accountId: acc.id, toAccountId: null, categoryId: 'cat-home', notes: 'Cuota', date: tx.date }
    );

    const [edited] = await db.getAllTransactionsWithCategory();
    expect(edited).toMatchObject({ type: 'payment', categoryId: 'cat-home', amount: 45_000 });
    expect((await db.getAllAccounts())[0].balance).toBe(55_000);
  });
});
