import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type * as DbModule from '../src/database/db';
import type * as StorageModule from '../src/services/receiptStorage';

// Sistema de archivos en memoria con la misma forma que expo-file-system
// (File, Directory, Paths), para probar la lógica sin un teléfono.
const mockFiles = new Map<string, string>();
jest.mock('expo-file-system', () => {
  const join = (...parts: unknown[]) =>
    parts.map((p) => (typeof p === 'string' ? p : (p as { uri: string }).uri)).join('/').replace(/([^:/])\/{2,}/g, '$1/');
  class Directory {
    uri: string;
    constructor(...parts: unknown[]) { this.uri = join(...parts); }
    create() {}
  }
  class File {
    uri: string;
    constructor(...parts: unknown[]) { this.uri = join(...parts); }
    get exists() { return mockFiles.has(this.uri); }
    copy(dest: File) { mockFiles.set(dest.uri, mockFiles.get(this.uri) ?? ''); }
    delete() { mockFiles.delete(this.uri); }
  }
  return { File, Directory, Paths: { document: new Directory('file:///docs') } };
});

describe('fotos de recibos en disco', () => {
  let storage: typeof StorageModule;

  beforeEach(() => {
    mockFiles.clear();
    jest.resetModules();
    storage = require('../src/services/receiptStorage');
  });

  it('copia la foto temporal y guarda solo una ruta relativa', () => {
    mockFiles.set('file:///tmp/camera/IMG_1.jpg', 'foto');
    const path = storage.saveReceiptPhoto('file:///tmp/camera/IMG_1.jpg');

    expect(path).toMatch(/^receipts\/rcpt-.+\.jpg$/); // nunca la ruta absoluta (cambia en iOS)
    expect(storage.resolveReceiptUri(path)).toBe(`file:///docs/${path}`);
  });

  it('una foto que ya no existe (respaldo restaurado en otro teléfono) se trata como sin foto', () => {
    expect(storage.resolveReceiptUri('receipts/no-existe.jpg')).toBeNull();
    expect(storage.resolveReceiptUri(null)).toBeNull();
  });

  it('borrar elimina el archivo y no falla si ya no estaba', () => {
    mockFiles.set('file:///tmp/IMG_2.png', 'foto');
    const path = storage.saveReceiptPhoto('file:///tmp/IMG_2.png');
    storage.deleteReceiptPhoto(path);
    expect(storage.resolveReceiptUri(path)).toBeNull();
    expect(() => storage.deleteReceiptPhoto(path)).not.toThrow();
  });
});

describe('foto del recibo en la base de datos', () => {
  let db: typeof DbModule;

  beforeEach(() => {
    jest.resetModules();
    db = require('../src/database/db');
  });

  it('se guarda al crear, se cambia al editar y se quita', async () => {
    await db.createAccount('Ahorros', 'savings', 100_000, '#00f', 'wallet');
    const [acc] = await db.getAllAccounts();
    const base = { type: 'expense' as const, amount: 20_000, accountId: acc.id, toAccountId: null,
      categoryId: 'cat-food', notes: 'Mercado', date: new Date().toISOString() };

    await db.createTransaction({ ...base, receiptUri: 'receipts/a.jpg' });
    let [tx] = await db.getAllTransactionsWithCategory();
    expect(tx.receiptUri).toBe('receipts/a.jpg');

    const previous = { amount: tx.amount, type: tx.type, accountId: tx.accountId, toAccountId: null };
    await db.updateTransaction(tx.id, previous, { ...base, receiptUri: 'receipts/b.jpg' });
    [tx] = await db.getAllTransactionsWithCategory();
    expect(tx.receiptUri).toBe('receipts/b.jpg');

    await db.updateTransaction(tx.id, previous, { ...base, receiptUri: null });
    [tx] = await db.getAllTransactionsWithCategory();
    expect(tx.receiptUri).toBeNull();
  });
});
