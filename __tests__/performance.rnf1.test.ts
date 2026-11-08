import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import type * as DbModule from '../src/database/db';
import type { TransactionInput } from '../src/models/types';

// RNF1 (Eficiencia): el Inicio y la lista de movimientos deben cargar en
// menos de 2 segundos con hasta 5.000 movimientos registrados.
// Esta prueba llena la base con 5.000 movimientos y mide las mismas
// consultas que usan esas pantallas, con el SQL real (node:sqlite).
// El límite de la prueba es de 2.000 ms por pantalla; en el teléfono el
// motor es SQLite nativo, que es igual o más rápido.

const TOTAL = 5_000;
const LIMIT_MS = 2_000;

let db: typeof DbModule;
let accountId = '';
const timings: Record<string, number> = {};

async function measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  timings[label] = Math.round(performance.now() - start);
  return result;
}

beforeAll(async () => {
  jest.resetModules();
  db = require('../src/database/db');
  await db.createAccount('Ahorros', 'savings', 50_000_000, '#00f', 'wallet');
  accountId = (await db.getAllAccounts())[0].id;
  const categories = await db.getAllCategories();

  // 5.000 movimientos repartidos en los últimos 12 meses
  const now = Date.now();
  const inputs: TransactionInput[] = Array.from({ length: TOTAL }, (_, i) => ({
    amount: 1_000 + (i % 97) * 350,
    type: i % 5 === 0 ? 'income' : 'expense',
    date: new Date(now - (i % 365) * 86_400_000).toISOString(),
    accountId,
    toAccountId: null,
    categoryId: categories[i % categories.length]?.id ?? null,
    notes: `Movimiento ${i}`,
  }));
  await measure('Importar 5.000 movimientos', () => db.importTransactions(inputs));
}, 60_000);

describe('RNF1 – rendimiento con 5.000 movimientos', () => {
  it('la base contiene los 5.000 movimientos', async () => {
    const all = await measure('Lista completa de movimientos', () => db.getAllTransactionsWithCategory());
    expect(all).toHaveLength(TOTAL);
    expect(timings['Lista completa de movimientos']).toBeLessThan(LIMIT_MS);
  });

  it('las consultas del Inicio responden en menos de 2 s', async () => {
    const today = new Date();
    const start = performance.now();
    await Promise.all([
      db.getTotalBalance(),
      db.getMonthlyTotals(today.getMonth() + 1, today.getFullYear()),
      db.getRecentTransactions(5),
      db.getCategoryBreakdown(today.getMonth() + 1, today.getFullYear()),
      db.getNetWorthHistory(6),
    ]);
    timings['Consultas del Inicio'] = Math.round(performance.now() - start);
    expect(timings['Consultas del Inicio']).toBeLessThan(LIMIT_MS);
  });

  it('el detalle de una cuenta responde en menos de 2 s', async () => {
    await measure('Detalle de cuenta (100 últimos)', () => db.getAccountTransactions(accountId, 100));
    expect(timings['Detalle de cuenta (100 últimos)']).toBeLessThan(LIMIT_MS);
  });

  it('el saldo queda exacto después de la carga masiva', async () => {
    const all = await db.getAllTransactionsWithCategory();
    const net = all.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
    const balance = await db.getTotalBalance();
    expect(balance).toBe(50_000_000 + net);
    // Deja los tiempos en la salida de la prueba como evidencia
    console.log('RNF1 tiempos (ms):', JSON.stringify(timings));
  });
});
