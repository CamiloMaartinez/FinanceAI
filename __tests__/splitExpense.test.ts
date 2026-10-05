import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { splitAmount } from '../src/utils/splitExpense';
import type * as DbModule from '../src/database/db';

describe('dividir un monto', () => {
  it('reparte en partes iguales', () => {
    expect(splitAmount(90_000, 3)).toEqual({ myShare: 30_000, otherShare: 30_000 });
  });

  it('el redondeo queda en la parte del usuario y todo suma el total', () => {
    const { myShare, otherShare } = splitAmount(100_000, 3);
    expect(otherShare).toBe(33_333);
    expect(myShare).toBe(33_334);
    expect(myShare + otherShare * 2).toBe(100_000);
  });

  it('una sola persona paga todo', () => {
    expect(splitAmount(50_000, 1)).toEqual({ myShare: 50_000, otherShare: 0 });
  });
});

describe('gasto compartido en la base de datos', () => {
  let db: typeof DbModule;
  let accountId: string;

  beforeEach(async () => {
    jest.resetModules();
    db = require('../src/database/db');
    await db.createAccount('Tarjeta', 'credit', 1_000_000, '#00f', 'card');
    accountId = (await db.getAllAccounts())[0].id;
  });

  const lunch = () => ({
    type: 'expense' as const, amount: 90_000, accountId, toAccountId: null,
    categoryId: 'cat-food', notes: 'Almuerzo', date: new Date(2026, 9, 10, 12).toISOString(),
  });

  it('solo tu parte cuenta como gasto, la cuenta baja el total y los demás te deben', async () => {
    await db.createSplitExpense(lunch(), ['Ana', 'Luis']);

    expect(await db.getMonthlyTotals(10, 2026)).toEqual({ income: 0, expense: 30_000 });
    expect((await db.getAllAccounts())[0].balance).toBe(910_000);

    const debts = await db.getAllDebts();
    expect(debts.map((d) => [d.personName, d.direction, d.remaining, d.notes]).sort()).toEqual([
      ['Ana', 'owed_to_me', 30_000, 'Almuerzo'],
      ['Luis', 'owed_to_me', 30_000, 'Almuerzo'],
    ]);
  });

  it('el gasto conserva su categoría y los movimientos de deuda dicen de quién es cada parte', async () => {
    await db.createSplitExpense(lunch(), ['Ana']);
    const txs = await db.getAllTransactionsWithCategory();
    expect(txs.find((t) => t.type === 'expense')).toMatchObject({ amount: 45_000, categoryId: 'cat-food' });
    expect(txs.find((t) => t.type === 'debt_out')?.notes).toBe('Almuerzo (parte de Ana)');
  });

  it('cuando un amigo paga, el dinero vuelve a la cuenta', async () => {
    await db.createSplitExpense(lunch(), ['Ana', 'Luis']);
    const ana = (await db.getAllDebts()).find((d) => d.personName === 'Ana')!;
    await db.addDebtPayment(ana.id, 30_000, new Date().toISOString(), accountId);
    expect((await db.getAllAccounts())[0].balance).toBe(940_000);
  });

  it('rechaza dividir sin personas o algo que no sea un gasto', async () => {
    await expect(db.createSplitExpense(lunch(), ['  '])).rejects.toThrow('al menos una persona');
    await expect(db.createSplitExpense({ ...lunch(), type: 'income' }, ['Ana'])).rejects.toThrow('Solo se pueden dividir gastos');
  });
});
