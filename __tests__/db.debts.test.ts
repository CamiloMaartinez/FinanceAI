import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type * as DbModule from '../src/database/db';

let db: typeof DbModule;
let accountId: string;
const iso = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).toISOString();

beforeEach(async () => {
  jest.resetModules();
  db = require('../src/database/db');
  await db.createAccount('Ahorros', 'savings', 1_000_000, '#00f', 'wallet');
  accountId = (await db.getAllAccounts())[0].id;
});

const balance = async () => (await db.getAllAccounts())[0].balance;
const lend = (amount: number, withAccount = true) => db.createDebt({
  direction: 'owed_to_me', personName: 'Ana', amount, notes: '', date: iso(2026, 10, 1),
  dueDate: iso(2026, 11, 1), accountId: withAccount ? accountId : null,
});

describe('crear una deuda', () => {
  it('prestar desde una cuenta resta del saldo', async () => {
    await lend(300_000);
    expect(await balance()).toBe(700_000);
    const [debt] = await db.getAllDebts();
    expect(debt).toMatchObject({ personName: 'Ana', amount: 300_000, paidAmount: 0, remaining: 300_000, isSettled: false });
  });

  it('pedir prestado a una cuenta suma al saldo', async () => {
    await db.createDebt({ direction: 'i_owe', personName: 'Banco', amount: 500_000, notes: '',
      date: iso(2026, 10, 1), dueDate: null, accountId });
    expect(await balance()).toBe(1_500_000);
  });

  it('sin cuenta solo registra la deuda y no toca ningún saldo', async () => {
    await lend(300_000, false);
    expect(await balance()).toBe(1_000_000);
    expect(await db.getAllTransactionsWithCategory()).toHaveLength(0);
  });

  it('no cuenta como ingreso ni como gasto del mes', async () => {
    await lend(300_000);
    expect(await db.getMonthlyTotals(10, 2026)).toEqual({ income: 0, expense: 0 });
  });
});

describe('abonos', () => {
  it('reducen lo pendiente y devuelven el dinero a la cuenta', async () => {
    const id = await lend(300_000);
    expect(await db.addDebtPayment(id, 100_000, iso(2026, 10, 10), accountId)).toBe(false);

    const [debt] = await db.getAllDebts();
    expect(debt).toMatchObject({ paidAmount: 100_000, remaining: 200_000, isSettled: false });
    expect(await balance()).toBe(800_000);
  });

  it('el último abono salda la deuda', async () => {
    const id = await lend(300_000);
    await db.addDebtPayment(id, 100_000, iso(2026, 10, 10), accountId);
    expect(await db.addDebtPayment(id, 200_000, iso(2026, 10, 20), accountId)).toBe(true);

    const [debt] = await db.getAllDebts();
    expect(debt.isSettled).toBe(true);
    expect(debt.remaining).toBe(0);
    expect(await balance()).toBe(1_000_000);
  });

  it('no permite abonar más de lo pendiente ni montos en cero', async () => {
    const id = await lend(300_000);
    await expect(db.addDebtPayment(id, 300_001, iso(2026, 10, 10), accountId)).rejects.toThrow('supera');
    await expect(db.addDebtPayment(id, 0, iso(2026, 10, 10), accountId)).rejects.toThrow('mayor que cero');
    expect(await db.getDebtPayments(id)).toHaveLength(0);
  });

  it('pagar lo que debo resta de la cuenta', async () => {
    const id = await db.createDebt({ direction: 'i_owe', personName: 'Luis', amount: 200_000, notes: '',
      date: iso(2026, 10, 1), dueDate: null, accountId: null });
    await db.addDebtPayment(id, 50_000, iso(2026, 10, 5), accountId);
    expect(await balance()).toBe(950_000);
  });
});

describe('borrar una deuda', () => {
  it('borra sus abonos y revierte todos los movimientos en las cuentas', async () => {
    const id = await lend(300_000);
    await db.addDebtPayment(id, 100_000, iso(2026, 10, 10), accountId);

    await db.deleteDebt(id);

    expect(await db.getAllDebts()).toHaveLength(0);
    expect(await db.getDebtPayments(id)).toHaveLength(0);
    expect(await db.getAllTransactionsWithCategory()).toHaveLength(0);
    expect(await balance()).toBe(1_000_000);
  });
});

describe('historial de patrimonio', () => {
  it('el cambio de saldo del mes incluye los movimientos de deudas', async () => {
    await lend(300_000); // 1 oct 2026: sale dinero
    expect(await db.getMonthlyBalanceChange(10, 2026)).toBe(-300_000);
  });
});
