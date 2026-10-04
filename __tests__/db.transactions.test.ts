import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type * as DbModule from '../src/database/db';
import type { TransactionInput } from '../src/models/types';

// Cada prueba arranca con una base de datos vacía: se recarga el módulo
// (db.ts guarda la conexión en una variable de módulo).
let db: typeof DbModule;

beforeEach(() => {
  jest.resetModules();
  db = require('../src/database/db');
});

async function setupAccounts() {
  await db.createAccount('Ahorros', 'savings', 1_000_000, '#00f', 'wallet');
  await db.createAccount('Nequi', 'digital', 200_000, '#f0f', 'phone');
  await db.createAccount('Dólares', 'savings', 500, '#0f0', 'cash', 'USD');
  const accounts = await db.getAllAccounts();
  const byName = (name: string) => accounts.find((a) => a.name === name)!;
  return { ahorros: byName('Ahorros'), nequi: byName('Nequi'), dolares: byName('Dólares') };
}

async function balances() {
  const accounts = await db.getAllAccounts();
  return Object.fromEntries(accounts.map((a) => [a.name, a.balance]));
}

function input(overrides: Partial<TransactionInput> & Pick<TransactionInput, 'type' | 'accountId'>): TransactionInput {
  return {
    amount: 50_000,
    date: new Date().toISOString(),
    toAccountId: null,
    categoryId: null,
    notes: '',
    ...overrides,
  };
}

describe('saldos de las cuentas', () => {
  it('un gasto resta de la cuenta', async () => {
    const { ahorros } = await setupAccounts();
    await db.createTransaction(input({ type: 'expense', accountId: ahorros.id, categoryId: 'cat-food' }));
    expect((await balances()).Ahorros).toBe(950_000);
  });

  it('un ingreso suma a la cuenta', async () => {
    const { nequi } = await setupAccounts();
    await db.createTransaction(input({ type: 'income', accountId: nequi.id, amount: 300_000 }));
    expect((await balances()).Nequi).toBe(500_000);
  });

  it('borrar un movimiento revierte el saldo', async () => {
    const { ahorros } = await setupAccounts();
    await db.createTransaction(input({ type: 'expense', accountId: ahorros.id }));
    const [tx] = await db.getAllTransactionsWithCategory();
    await db.deleteTransaction(tx);
    expect((await balances()).Ahorros).toBe(1_000_000);
    expect(await db.getAllTransactionsWithCategory()).toHaveLength(0);
  });

  it('editar el monto y la cuenta mueve el saldo correctamente', async () => {
    const { ahorros, nequi } = await setupAccounts();
    await db.createTransaction(input({ type: 'expense', accountId: ahorros.id, amount: 100_000 }));
    const [tx] = await db.getAllTransactionsWithCategory();

    await db.updateTransaction(
      tx.id,
      { amount: tx.amount, type: tx.type, accountId: tx.accountId, toAccountId: null },
      input({ type: 'expense', accountId: nequi.id, amount: 30_000 })
    );

    const b = await balances();
    expect(b.Ahorros).toBe(1_000_000); // se le devolvieron los 100.000
    expect(b.Nequi).toBe(170_000);     // se le restaron 30.000
  });
});

describe('transferencias', () => {
  it('restan de una cuenta y suman a la otra; el total no cambia', async () => {
    const { ahorros, nequi } = await setupAccounts();
    const totalBefore = await db.getTotalBalance();

    await db.createTransaction(input({ type: 'transfer', accountId: ahorros.id, toAccountId: nequi.id, amount: 150_000 }));

    const b = await balances();
    expect(b.Ahorros).toBe(850_000);
    expect(b.Nequi).toBe(350_000);
    expect(await db.getTotalBalance()).toBe(totalBefore);
  });

  it('muestran el nombre de la cuenta destino', async () => {
    const { ahorros, nequi } = await setupAccounts();
    await db.createTransaction(input({ type: 'transfer', accountId: ahorros.id, toAccountId: nequi.id }));
    const [tx] = await db.getAllTransactionsWithCategory();
    expect(tx.accountName).toBe('Ahorros');
    expect(tx.toAccountName).toBe('Nequi');
  });

  it('no cuentan como ingreso ni como gasto del mes', async () => {
    const { ahorros, nequi } = await setupAccounts();
    await db.createTransaction(input({ type: 'transfer', accountId: ahorros.id, toAccountId: nequi.id, amount: 400_000 }));
    const now = new Date();
    expect(await db.getMonthlyTotals(now.getMonth() + 1, now.getFullYear())).toEqual({ income: 0, expense: 0 });
  });

  it('borrar una transferencia revierte las dos cuentas', async () => {
    const { ahorros, nequi } = await setupAccounts();
    await db.createTransaction(input({ type: 'transfer', accountId: ahorros.id, toAccountId: nequi.id }));
    const [tx] = await db.getAllTransactionsWithCategory();
    await db.deleteTransaction(tx);
    const b = await balances();
    expect(b.Ahorros).toBe(1_000_000);
    expect(b.Nequi).toBe(200_000);
  });

  it('convertir un gasto en transferencia ajusta ambas cuentas', async () => {
    const { ahorros, nequi } = await setupAccounts();
    await db.createTransaction(input({ type: 'expense', accountId: ahorros.id, amount: 80_000 }));
    const [tx] = await db.getAllTransactionsWithCategory();

    await db.updateTransaction(
      tx.id,
      { amount: tx.amount, type: tx.type, accountId: tx.accountId, toAccountId: null },
      input({ type: 'transfer', accountId: ahorros.id, toAccountId: nequi.id, amount: 80_000 })
    );

    const b = await balances();
    expect(b.Ahorros).toBe(920_000);
    expect(b.Nequi).toBe(280_000);
  });

  it('una transferencia sin cuenta destino falla y no deja nada a medias', async () => {
    const { ahorros } = await setupAccounts();
    await expect(
      db.createTransaction(input({ type: 'transfer', accountId: ahorros.id, toAccountId: null }))
    ).rejects.toThrow('cuenta destino');

    expect((await balances()).Ahorros).toBe(1_000_000);
    expect(await db.getAllTransactionsWithCategory()).toHaveLength(0);
  });
});

describe('saldo total', () => {
  it('convierte las cuentas en otra moneda a pesos', async () => {
    await setupAccounts();
    // 1.000.000 + 200.000 + 500 USD × 4.000 (tasa por defecto)
    expect(await db.getTotalBalance()).toBe(3_200_000);
  });
});

describe('identificadores', () => {
  it('son únicos aunque se creen muchos movimientos seguidos', async () => {
    const { ahorros } = await setupAccounts();
    for (let i = 0; i < 30; i++) {
      await db.createTransaction(input({ type: 'expense', accountId: ahorros.id, amount: 1 }));
    }
    const ids = (await db.getAllTransactionsWithCategory()).map((t) => t.id);
    expect(new Set(ids).size).toBe(30);
  });
});
