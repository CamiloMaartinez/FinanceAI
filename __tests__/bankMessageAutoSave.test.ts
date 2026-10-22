import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type * as DbModule from '../src/database/db';
import type * as AutoSaveModule from '../src/services/bankMessageAutoSave';
import { parseBankMessage, buildPrefillFromMessage } from '../src/utils/bankMessage';

// La IA no está disponible en las pruebas: sugiere la primera categoría
jest.mock('../src/services/ai', () => ({
  suggestCategory: jest.fn(async (_d: string, names: string[]) => names[0] ?? null),
}));

// Cada prueba arranca con una base de datos vacía (con las categorías por defecto)
let db: typeof DbModule;
let autoSave: typeof AutoSaveModule;
beforeEach(async () => {
  jest.resetModules();
  db = require('../src/database/db');
  autoSave = require('../src/services/bankMessageAutoSave');
  await require('../src/database/seed').seedIfEmpty();
});

async function fromSms(text: string) {
  const accounts = await db.getAllAccounts();
  const history = await db.getAllTransactionsWithCategory();
  const msg = parseBankMessage(text)!;
  const prefill = buildPrefillFromMessage(msg, accounts, history);
  return autoSave.autoSaveFromMessage(prefill, msg.currency, accounts, await db.getAllCategories(), history);
}

describe('guardar solo el mensaje del banco (con base de datos real)', () => {
  it('guarda el gasto, descuenta el saldo y no repite el mismo SMS', async () => {
    await db.createAccount('Bancolombia *1234', 'savings', 500_000, '#FFD60A', 'wallet');
    const sms = 'Bancolombia: Compraste $45.900 en EXITO CALLE 80 con tu T.Deb *1234.';

    const first = await fromSms(sms);
    expect(first.status).toBe('saved');
    const txs = await db.getAllTransactionsWithCategory();
    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({ amount: 45_900, type: 'expense', notes: 'Exito Calle 80' });
    expect(txs[0].categoryId).toBeTruthy();
    expect((await db.getAllAccounts())[0].balance).toBe(500_000 - 45_900);

    const second = await fromSms(sms);
    expect(second.status).toBe('review');
    expect(await db.getAllTransactionsWithCategory()).toHaveLength(1);
  });

  it('sin cuenta reconocida no guarda nada', async () => {
    await db.createAccount('Efectivo', 'cash', 0, '#30D158', 'cash');
    const result = await fromSms('BBVA: Compraste $10.000 en TIENDA con tu tarjeta *7777.');
    expect(result.status).toBe('review');
    expect(await db.getAllTransactionsWithCategory()).toHaveLength(0);
  });
});
