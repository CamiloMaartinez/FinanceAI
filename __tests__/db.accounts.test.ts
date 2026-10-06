import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type * as DbModule from '../src/database/db';
import { suggestAccountIcon, ACCOUNT_COLOR_OPTIONS } from '../src/constants/accountStyles';
import { balanceHint } from '../src/constants/accounts';

const base = { categoryId: null, notes: '', toAccountId: null, toAmount: null };

describe('edición de cuentas', () => {
  let db: typeof DbModule;
  let id: string;

  beforeEach(async () => {
    jest.resetModules();
    db = require('../src/database/db');
    id = await db.createAccount('Nequi', 'digital', 100_000, '#D9DAFB', 'billetera', 'COP', '#FBDDE6');
  });

  it('guarda el degradado y edita nombre, tipo, color e ícono sin tocar el saldo', async () => {
    expect(await db.getAccountById(id)).toMatchObject({ gradientTo: '#FBDDE6', balance: 100_000 });
    await db.updateAccount(id, { name: ' Nequi Ahorro ', type: 'savings', colorHex: '#1F5A3D', gradientTo: null, iconName: 'ahorro' });
    expect(await db.getAccountById(id)).toMatchObject({
      name: 'Nequi Ahorro', type: 'savings', colorHex: '#1F5A3D', gradientTo: null, iconName: 'ahorro', balance: 100_000,
    });
  });

  it('cambiar el saldo crea un "Ajuste de saldo" por la diferencia', async () => {
    expect(await db.setAccountBalance(id, 80_000)).toBe(-20_000);
    expect((await db.getAccountById(id))!.balance).toBe(80_000);
    const [tx] = await db.getAccountTransactions(id);
    expect(tx).toMatchObject({ type: 'expense', amount: 20_000, notes: 'Ajuste de saldo' });

    expect(await db.setAccountBalance(id, 150_000)).toBe(70_000);
    expect((await db.getAccountById(id))!.balance).toBe(150_000);
    // Sin cambio no se crea nada
    expect(await db.setAccountBalance(id, 150_000)).toBe(0);
    expect(await db.countAccountTransactions(id)).toBe(2);
  });

  it('la moneda solo cambia si la cuenta no tiene movimientos', async () => {
    await db.updateAccount(id, { name: 'Nequi', type: 'digital', colorHex: '#D9DAFB', iconName: 'dolar', currency: 'USD' });
    expect((await db.getAccountById(id))!.currency).toBe('USD');

    await db.createTransaction({ ...base, type: 'expense', amount: 5, accountId: id, date: new Date().toISOString() });
    await expect(
      db.updateAccount(id, { name: 'Nequi', type: 'digital', colorHex: '#D9DAFB', iconName: 'peso', currency: 'COP' })
    ).rejects.toThrow('moneda');
  });

  it('entradas y salidas del mes cuentan las transferencias de la cuenta', async () => {
    const other = await db.createAccount('Efectivo', 'cash', 0, '#F8C98F', 'peso', 'COP');
    const now = new Date().toISOString();
    await db.createTransaction({ ...base, type: 'income', amount: 30_000, accountId: id, date: now });
    await db.createTransaction({ ...base, type: 'transfer', amount: 10_000, accountId: id, toAccountId: other, date: now });
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    expect(await db.getAccountFlowsSince(id, monthStart)).toEqual({ income: 30_000, expense: 10_000 });
    expect(await db.getAccountFlowsSince(other, monthStart)).toEqual({ income: 10_000, expense: 0 });
    // Ambas cuentas ven la transferencia en su lista
    expect((await db.getAccountTransactions(other)).map((t) => t.type)).toEqual(['transfer']);
  });

  it('la serie del saldo termina en el saldo actual', async () => {
    const series = await db.getAccountBalanceSeries(id);
    expect(series[series.length - 1]).toEqual({ label: 'Hoy', value: 100_000 });
    expect(series.length).toBe(11);
  });

  it('eliminar solo sin movimientos; archivar y restaurar', async () => {
    await db.createTransaction({ ...base, type: 'expense', amount: 1000, accountId: id, date: new Date().toISOString() });
    await expect(db.deleteAccountPermanently(id)).rejects.toThrow('Archívala');

    await db.deleteAccount(id);
    expect((await db.getAllAccounts()).some((a) => a.id === id)).toBe(false);
    await db.restoreAccount(id);
    expect((await db.getAllAccounts()).some((a) => a.id === id)).toBe(true);

    const empty = await db.createAccount('Vacía', 'cash', 0, '#F8C98F', 'peso');
    await db.deleteAccountPermanently(empty);
    expect(await db.getAccountById(empty)).toBeNull();
  });
});

describe('estilos de cuenta', () => {
  it('al menos 16 colores, con 4 degradados', () => {
    expect(ACCOUNT_COLOR_OPTIONS.length).toBeGreaterThanOrEqual(16);
    expect(ACCOUNT_COLOR_OPTIONS.filter((o) => o.gradientTo).length).toBe(4);
  });

  it('sugiere el ícono por tipo y moneda', () => {
    expect(suggestAccountIcon('credit', 'COP')).toBe('tarjeta');
    expect(suggestAccountIcon('checking', 'COP')).toBe('banco');
    expect(suggestAccountIcon('cash', 'USD')).toBe('dolar');
    expect(suggestAccountIcon('cash', 'EUR')).toBe('euro');
  });

  it('aclaración del saldo según el tipo', () => {
    expect(balanceHint('savings')).toBe('Disponible');
    expect(balanceHint('investment')).toBe('Invertido');
    expect(balanceHint('credit')).toBe('Por pagar');
  });
});
