import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { convertBetween } from '../src/services/exchangeRates';
import type * as DbModule from '../src/database/db';

const rates = { USD: 3311.64, EUR: 3726.03 };

describe('convertir entre monedas', () => {
  it('pesos a dólares y dólares a pesos, redondeado a centavos', () => {
    expect(convertBetween(1_000_000, 'COP', 'USD', rates)).toBe(301.97);
    expect(convertBetween(100, 'USD', 'COP', rates)).toBe(331_164);
  });

  it('entre dos monedas extranjeras pasa por pesos', () => {
    expect(convertBetween(100, 'EUR', 'USD', rates)).toBe(112.51);
  });

  it('misma moneda no cambia el monto', () => {
    expect(convertBetween(5000, 'COP', 'COP', rates)).toBe(5000);
  });
});

describe('transferencia entre cuentas de distinta moneda', () => {
  let db: typeof DbModule;
  let cop: string;
  let usd: string;

  beforeEach(async () => {
    jest.resetModules();
    db = require('../src/database/db');
    await db.createAccount('Ahorros', 'savings', 2_000_000, '#00f', 'wallet', 'COP');
    await db.createAccount('Dólares', 'savings', 100, '#0f0', 'cash', 'USD');
    const accounts = await db.getAllAccounts();
    cop = accounts.find((a) => a.currency === 'COP')!.id;
    usd = accounts.find((a) => a.currency === 'USD')!.id;
  });

  const balances = async () => Object.fromEntries((await db.getAllAccounts()).map((a) => [a.name, a.balance]));
  const transfer = { type: 'transfer' as const, amount: 1_000_000, accountId: '', toAccountId: '', toAmount: 300,
    categoryId: null, notes: 'Compra de dólares', date: new Date().toISOString() };

  it('cada cuenta se mueve en su propia moneda', async () => {
    await db.createTransaction({ ...transfer, accountId: cop, toAccountId: usd });
    const b = await balances();
    expect(b['Ahorros']).toBe(1_000_000); // salió 1.000.000 COP
    expect(b['Dólares']).toBe(400);       // llegaron 300 USD
  });

  it('la lista muestra cuánto llegó y en qué moneda', async () => {
    await db.createTransaction({ ...transfer, accountId: cop, toAccountId: usd });
    const [tx] = await db.getAllTransactionsWithCategory();
    expect(tx).toMatchObject({ toAmount: 300, toAccountName: 'Dólares', toAccountCurrency: 'USD' });
  });

  it('borrarla revierte ambas cuentas con sus montos respectivos', async () => {
    await db.createTransaction({ ...transfer, accountId: cop, toAccountId: usd });
    const [tx] = await db.getAllTransactionsWithCategory();
    await db.deleteTransaction(tx);
    expect(await balances()).toEqual({ Ahorros: 2_000_000, 'Dólares': 100 });
  });

  it('editar el monto recibido ajusta solo la cuenta destino', async () => {
    await db.createTransaction({ ...transfer, accountId: cop, toAccountId: usd });
    const [tx] = await db.getAllTransactionsWithCategory();
    await db.updateTransaction(
      tx.id,
      { amount: tx.amount, type: tx.type, accountId: tx.accountId, toAccountId: tx.toAccountId ?? null, toAmount: tx.toAmount },
      { ...transfer, accountId: cop, toAccountId: usd, toAmount: 295.5 }
    );
    expect(await balances()).toEqual({ Ahorros: 1_000_000, 'Dólares': 395.5 });
  });

  it('las transferencias de la misma moneda siguen moviendo el mismo monto', async () => {
    await db.createAccount('Nequi', 'digital', 0, '#f0f', 'phone', 'COP');
    const nequi = (await db.getAllAccounts()).find((a) => a.name === 'Nequi')!.id;
    await db.createTransaction({ ...transfer, amount: 50_000, toAmount: null, accountId: cop, toAccountId: nequi });
    expect((await balances())['Nequi']).toBe(50_000);
  });
});
