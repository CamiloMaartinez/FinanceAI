import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type * as DbModule from '../src/database/db';
import { describeActivity } from '../src/utils/activityLog';

// Historial de actividad (bitácora): ISO/IEC 25010, no repudio y responsabilidad.

// El llavero del teléfono, en memoria
const mockSecure = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => mockSecure.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => { mockSecure.set(k, v); },
  deleteItemAsync: async (k: string) => { mockSecure.delete(k); },
}));

let db: typeof DbModule;
let accountId: string;

beforeEach(async () => {
  jest.resetModules();
  mockSecure.clear();
  db = require('../src/database/db');
  await db.createAccount('Ahorros', 'savings', 1_000_000, '#00f', 'wallet');
  accountId = (await db.getAllAccounts())[0].id;
});

const expense = (amount: number, notes = '') => db.createTransaction({
  type: 'expense', amount, accountId, toAccountId: null, categoryId: null, notes, date: new Date().toISOString(),
});
const log = () => db.getActivityLog();

describe('cambios a los datos', () => {
  it('anota la creación de cuentas y movimientos con su resumen', async () => {
    await expense(45_000, 'Almuerzo');
    const [mov, cuenta] = await log();
    expect(mov).toMatchObject({ entity: 'Movimiento', action: 'crear', summary: 'Gasto de $45.000 · Almuerzo' });
    expect(cuenta).toMatchObject({ entity: 'Cuenta', action: 'crear', summary: 'Ahorros', entityId: accountId });
    expect(new Date(mov.at).getTime()).not.toBeNaN();
  });

  it('el saldo que cambia solo con un gasto no cuenta como edición de la cuenta', async () => {
    await expense(10_000);
    expect((await log()).filter((e) => e.entity === 'Cuenta' && e.action === 'editar')).toHaveLength(0);
  });

  it('anota la edición de una cuenta y la eliminación de un movimiento', async () => {
    const id = await expense(20_000);
    await db.updateAccount(accountId, { name: 'Ahorros Bancolombia', type: 'savings', colorHex: '#00f', iconName: 'wallet' });
    await db.deleteTransaction({ id, amount: 20_000, type: 'expense', accountId, toAccountId: null, toAmount: null });
    const [borrado, edicion] = await log();
    expect(edicion).toMatchObject({ entity: 'Cuenta', action: 'editar', summary: 'Ahorros Bancolombia' });
    expect(borrado).toMatchObject({ entity: 'Movimiento', action: 'eliminar', entityId: id, summary: 'Gasto de $20.000' });
  });

  it('anota metas creadas', async () => {
    await db.createGoal('Viaje a Cartagena', 2_000_000, new Date(2027, 0, 1).toISOString(), 'high', '#f00', 'airplane');
    expect((await log())[0]).toMatchObject({ entity: 'Meta', action: 'crear', summary: 'Viaje a Cartagena ($2.000.000)' });
  });
});

describe('no se puede alterar', () => {
  it('rechaza editar o borrar entradas', async () => {
    await expense(5_000);
    const database = await db.getDb();
    await expect(database.runAsync(`UPDATE activity_log SET summary = 'otro'`)).rejects.toThrow('no se puede modificar');
    await expect(database.runAsync(`DELETE FROM activity_log`)).rejects.toThrow('no se puede borrar');
    expect((await log())[0].summary).toBe('Gasto de $5.000');
  });
});

describe('eventos de seguridad', () => {
  it('anota crear y cambiar el PIN, y los intentos fallidos', async () => {
    const pin = require('../src/services/pinAuth');
    await pin.setPin('1234');
    await pin.setPin('5678');
    expect(await pin.verifyPin('0000')).toBe(false);
    expect(await pin.verifyPin('5678')).toBe(true);
    const seguridad = (await log()).filter((e) => e.action === 'seguridad').map((e) => e.summary);
    expect(seguridad).toEqual(['Intento fallido de PIN', 'PIN de respaldo cambiado', 'PIN de respaldo creado']);
  });

  it('pausar la bitácora evita una entrada por fila (restaurar respaldo)', async () => {
    const database = await db.getDb();
    const before = (await log()).length;
    await db.withActivityLogPaused(database, async () => {
      await database.execAsync('DELETE FROM accounts;');
    });
    expect(await log()).toHaveLength(before);
    await expense(1_000).catch(() => {});
    await db.createAccount('Nequi', 'digital', 0, '#f0f', 'phone');
    expect((await log())[0]).toMatchObject({ entity: 'Cuenta', action: 'crear', summary: 'Nequi' });
  });
});

describe('describeActivity', () => {
  it('arma el título según la acción', () => {
    expect(describeActivity({ entity: 'Movimiento', action: 'crear' })).toBe('Movimiento creado');
    expect(describeActivity({ entity: 'Cuenta', action: 'eliminar' })).toBe('Cuenta eliminada');
    expect(describeActivity({ entity: 'Seguridad', action: 'seguridad' })).toBe('Seguridad');
  });
});
