import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type * as DbModule from '../src/database/db';

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

describe('patrimonio por periodo y cambio de cada cuenta', () => {
  let db: typeof DbModule;
  let ahorros: string;
  let efectivo: string;

  beforeEach(async () => {
    jest.resetModules();
    db = require('../src/database/db');
    await db.createAccount('Ahorros', 'savings', 1_000_000, '#00f', 'wallet', 'COP');
    await db.createAccount('Efectivo', 'cash', 0, '#0f0', 'cash', 'COP');
    const accounts = await db.getAllAccounts();
    ahorros = accounts.find((a) => a.name === 'Ahorros')!.id;
    efectivo = accounts.find((a) => a.name === 'Efectivo')!.id;

    const base = { categoryId: null, notes: '', toAccountId: null, toAmount: null };
    await db.createTransaction({ ...base, type: 'income', amount: 500_000, accountId: ahorros, date: daysAgo(5) });
    await db.createTransaction({ ...base, type: 'expense', amount: 100_000, accountId: ahorros, date: daysAgo(2) });
    await db.createTransaction({ ...base, type: 'transfer', amount: 50_000, accountId: ahorros, toAccountId: efectivo, date: daysAgo(1) });
  });

  it('7 días: un punto por día y termina en el saldo de hoy', async () => {
    const series = await db.getNetWorthSeries('7d');
    expect(series).toHaveLength(8);
    expect(series[series.length - 1]).toMatchObject({ label: 'Hoy', value: 1_400_000 });
    // Antes del ingreso el patrimonio era el saldo inicial; la transferencia no lo cambia
    expect(series[0].value).toBe(1_000_000);
    expect(series[6].value).toBe(1_400_000);
  });

  it('los periodos largos usan meses y "Todo" arranca en el primer movimiento', async () => {
    expect(await db.getNetWorthSeries('6m')).toHaveLength(7);
    expect(await db.getNetWorthSeries('1a')).toHaveLength(13);
    const all = await db.getNetWorthSeries('all');
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('el cambio de cada cuenta incluye las transferencias de entrada y salida', async () => {
    const changes = await db.getAccountChangesSince(daysAgo(30));
    expect(changes[ahorros]).toBe(500_000 - 100_000 - 50_000);
    expect(changes[efectivo]).toBe(50_000);
  });
});
