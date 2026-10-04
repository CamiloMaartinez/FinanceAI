import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  buildTransactionsCsv, escapeCsvText, formatCsvNumber, formatCsvDate, CSV_HEADERS,
} from '../src/utils/csv';
import type * as DbModule from '../src/database/db';

const lines = (csv: string) => csv.replace(/^﻿/, '').trimEnd().split('\r\n');

describe('campos del CSV', () => {
  it('números sin separador de miles y con coma decimal', () => {
    expect(formatCsvNumber(3_500_000)).toBe('3500000');
    expect(formatCsvNumber(12.5)).toBe('12,5');
    expect(formatCsvNumber(10.456)).toBe('10,46');
  });

  it('fecha local en formato AAAA-MM-DD', () => {
    expect(formatCsvDate(new Date(2026, 0, 5, 23, 30).toISOString())).toBe('2026-01-05');
  });

  it('pone entre comillas los textos con ; comillas o saltos de línea', () => {
    expect(escapeCsvText('Pan; leche')).toBe('"Pan; leche"');
    expect(escapeCsvText('Dijo "hola"')).toBe('"Dijo ""hola"""');
    expect(escapeCsvText('línea1\nlínea2')).toBe('"línea1\nlínea2"');
    expect(escapeCsvText(null)).toBe('');
  });

  it.each(['=HYPERLINK("http://x")', '+57 300', '-50 descuento', '@SUM(A1)'])(
    'neutraliza fórmulas de Excel: %s',
    (text) => {
      expect(escapeCsvText(text).replace(/^"/, '').startsWith("'")).toBe(true);
    }
  );
});

describe('archivo completo', () => {
  it('empieza con la marca UTF-8 y los encabezados', () => {
    const csv = buildTransactionsCsv([], []);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(lines(csv)).toEqual([CSV_HEADERS.join(';')]);
  });
});

describe('exportar desde la base de datos', () => {
  let db: typeof DbModule;

  beforeEach(() => {
    jest.resetModules();
    db = require('../src/database/db');
  });

  it('incluye gastos, ingresos y transferencias con su moneda y cuentas', async () => {
    await db.createAccount('Ahorros', 'savings', 1_000_000, '#00f', 'wallet');
    await db.createAccount('Nequi', 'digital', 0, '#f0f', 'phone');
    await db.createAccount('Dólares', 'savings', 100, '#0f0', 'cash', 'USD');
    const accounts = await db.getAllAccounts();
    const id = (name: string) => accounts.find((a) => a.name === name)!.id;
    const base = { toAccountId: null, categoryId: null, notes: '' };

    await db.createTransaction({ ...base, type: 'expense', amount: 25_000, accountId: id('Ahorros'),
      date: new Date(2026, 9, 1, 12).toISOString(), notes: 'Almuerzo; con equipo' });
    await db.createTransaction({ ...base, type: 'income', amount: 12.5, accountId: id('Dólares'),
      date: new Date(2026, 9, 2, 12).toISOString(), notes: 'Freelance' });
    await db.createTransaction({ ...base, type: 'transfer', amount: 100_000, accountId: id('Ahorros'),
      toAccountId: id('Nequi'), date: new Date(2026, 9, 3, 12).toISOString() });

    const csv = buildTransactionsCsv(await db.getAllTransactionsWithCategory(), accounts);

    expect(lines(csv)).toEqual([
      'Fecha;Tipo;Monto;Moneda;Cuenta;Cuenta destino;Categoría;Nota',
      '2026-10-03;Transferencia;100000;COP;Ahorros;Nequi;;',
      '2026-10-02;Ingreso;12,5;USD;Dólares;;;Freelance',
      '2026-10-01;Gasto;25000;COP;Ahorros;;;"Almuerzo; con equipo"',
    ]);
  });
});
