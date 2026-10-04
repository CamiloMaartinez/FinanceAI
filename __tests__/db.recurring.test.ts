import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type * as DbModule from '../src/database/db';

let db: typeof DbModule;
let accountId: string;

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

beforeEach(async () => {
  jest.resetModules();
  db = require('../src/database/db');
  await db.createAccount('Ahorros', 'savings', 1_000_000, '#00f', 'wallet');
  accountId = (await db.getAllAccounts())[0].id;
});

async function balance() {
  return (await db.getAllAccounts())[0].balance;
}

function salary(amount = 3_000_000) {
  return { amount, type: 'income' as const, date: '', accountId, categoryId: null, notes: 'Salario' };
}

describe('crear un recurrente', () => {
  it('queda programado para la siguiente repetición, no para la fecha original', async () => {
    await db.createRecurring(salary(), 'monthly', day(2026, 1, 31));
    const [rule] = await db.getAllRecurring();
    expect(new Date(rule.nextDate)).toEqual(day(2026, 2, 28));
    expect(rule.anchorDay).toBe(31);
    expect(rule.accountName).toBe('Ahorros');
  });
});

describe('generar los recurrentes pendientes', () => {
  it('crea un movimiento por cada fecha vencida y ajusta el saldo', async () => {
    await db.createRecurring(salary(), 'monthly', day(2026, 6, 15));

    const created = await db.processDueRecurring(day(2026, 9, 20));

    expect(created).toBe(3); // 15 jul, 15 ago, 15 sep
    const dates = (await db.getAllTransactionsWithCategory()).map((t) => new Date(t.date)).sort((a, b) => +a - +b);
    expect(dates).toEqual([day(2026, 7, 15), day(2026, 8, 15), day(2026, 9, 15)]);
    expect(await balance()).toBe(1_000_000 + 3 * 3_000_000);
  });

  it('deja programada la siguiente fecha futura', async () => {
    await db.createRecurring(salary(), 'monthly', day(2026, 6, 15));
    await db.processDueRecurring(day(2026, 9, 20));
    const [rule] = await db.getAllRecurring();
    expect(new Date(rule.nextDate)).toEqual(day(2026, 10, 15));
  });

  it('no duplica movimientos si se ejecuta dos veces', async () => {
    await db.createRecurring(salary(), 'weekly', day(2026, 9, 1));
    expect(await db.processDueRecurring(day(2026, 9, 20))).toBe(2); // 8 y 15 sep
    expect(await db.processDueRecurring(day(2026, 9, 20))).toBe(0);
    expect(await db.getAllTransactionsWithCategory()).toHaveLength(2);
  });

  it('los gastos recurrentes restan del saldo y conservan su categoría', async () => {
    await db.createRecurring(
      { amount: 1_200_000, type: 'expense', date: '', accountId, categoryId: 'cat-home', notes: 'Arriendo' },
      'monthly',
      day(2026, 8, 5)
    );
    await db.processDueRecurring(day(2026, 9, 6));
    const [tx] = await db.getAllTransactionsWithCategory();
    expect(tx.type).toBe('expense');
    expect(tx.categoryId).toBe('cat-home');
    expect(tx.notes).toBe('Arriendo');
    expect(await balance()).toBe(1_000_000 - 1_200_000);
  });

  it('no genera nada si todavía no vence', async () => {
    await db.createRecurring(salary(), 'monthly', day(2026, 9, 15));
    expect(await db.processDueRecurring(day(2026, 10, 1))).toBe(0);
  });

  it('se pone al día con un máximo de 24 movimientos', async () => {
    await db.createRecurring(salary(1), 'weekly', day(2024, 1, 1));
    expect(await db.processDueRecurring(day(2026, 9, 20))).toBe(24);
  });
});

describe('detener un recurrente', () => {
  it('deja de generar movimientos pero conserva los ya creados', async () => {
    await db.createRecurring(salary(), 'monthly', day(2026, 7, 1));
    await db.processDueRecurring(day(2026, 8, 2));
    const [rule] = await db.getAllRecurring();

    await db.deleteRecurring(rule.id);

    expect(await db.getAllRecurring()).toHaveLength(0);
    expect(await db.processDueRecurring(day(2026, 12, 31))).toBe(0);
    expect(await db.getAllTransactionsWithCategory()).toHaveLength(1);
  });
});
