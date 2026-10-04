// Lectura de extractos bancarios en CSV. Funciones puras (sin base de
// datos ni archivos) para poder probarlas con ejemplos de distintos bancos.

import type { TransactionWithCategory } from '../models/types';

export interface ColumnMapping {
  date: number;
  description: number;
  amount: number | null;  // una sola columna con signo (+ ingreso, − gasto)
  debit: number | null;   // o columnas separadas de débito (gasto)...
  credit: number | null;  // ...y crédito (ingreso)
  kind: number | null;    // columna opcional "Tipo": D/C, débito/crédito
}

export interface ImportedRow {
  date: string;            // ISO, mediodía local
  description: string;
  amount: number;          // siempre positivo
  type: 'income' | 'expense';
  line: number;            // fila del archivo (1 = primera), para mensajes
}

export interface ParseResult {
  headers: string[];
  mapping: ColumnMapping | null;
  rows: ImportedRow[];
  skipped: number;         // filas con datos que no se pudieron leer
}

// ─── CSV básico ─────────────────────────────────────────────

function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 15).join('\n');
  const candidates = [';', ',', '\t', '|'];
  const counts = candidates.map((d) => sample.split(d).length - 1);
  return candidates[counts.indexOf(Math.max(...counts))];
}

// Separa en filas y celdas respetando comillas ("a; b", comillas dobles "")
export function parseCsv(text: string, delimiter = detectDelimiter(text)): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const clean = text.replace(/^﻿/, '');

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"' && clean[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell.trim()); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(cell.trim()); rows.push(row); row = []; cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) { row.push(cell.trim()); rows.push(row); }
  return rows;
}

// ─── Encabezados y columnas ─────────────────────────────────

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

const KEYWORDS = {
  date: ['fecha', 'date', 'fecha de transaccion', 'fecha operacion', 'fecha movimiento'],
  description: ['descripcion', 'concepto', 'detalle', 'description', 'referencia', 'movimiento', 'transaccion', 'comercio'],
  amount: ['valor', 'monto', 'importe', 'amount', 'valor transaccion'],
  debit: ['debito', 'debitos', 'cargo', 'cargos', 'debit', 'retiro', 'retiros', 'egreso', 'salida'],
  credit: ['credito', 'creditos', 'abono', 'abonos', 'credit', 'deposito', 'depositos', 'ingreso', 'entrada'],
  kind: ['tipo', 'naturaleza', 'type', 'd/c', 'db/cr'],
};

function findColumn(headers: string[], words: string[], exclude: number[] = []): number | null {
  const norm = headers.map(normalize);
  // Primero coincidencia exacta, luego "contiene"
  for (const match of [(h: string, w: string) => h === w, (h: string, w: string) => h.includes(w)]) {
    for (const w of words) {
      const idx = norm.findIndex((h, i) => !exclude.includes(i) && h !== '' && match(h, w));
      if (idx !== -1) return idx;
    }
  }
  return null;
}

export function detectMapping(headers: string[]): ColumnMapping | null {
  const date = findColumn(headers, KEYWORDS.date);
  if (date === null) return null;
  const debit = findColumn(headers, KEYWORDS.debit, [date]);
  const credit = findColumn(headers, KEYWORDS.credit, [date, ...(debit !== null ? [debit] : [])]);
  const used = [date, debit, credit].filter((x): x is number => x !== null);
  const amount = debit !== null && credit !== null ? null : findColumn(headers, KEYWORDS.amount, used);
  const description = findColumn(headers, KEYWORDS.description, [...used, ...(amount !== null ? [amount] : [])]);
  const kind = findColumn(headers, KEYWORDS.kind, [...used, ...(amount !== null ? [amount] : []), ...(description !== null ? [description] : [])]);

  if (description === null) return null;
  if (amount === null && (debit === null || credit === null)) return null;
  return { date, description, amount, debit: amount === null ? debit : null, credit: amount === null ? credit : null, kind };
}

// La fila de encabezados puede no ser la primera (los bancos suelen poner
// antes el número de cuenta, el titular, el período...)
function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    if (detectMapping(rows[i])) return i;
  }
  return 0;
}

// ─── Fechas y montos ────────────────────────────────────────

type DateOrder = 'dmy' | 'mdy';

// Si algún primer número pasa de 12, es día/mes; si algún segundo número
// pasa de 12, es mes/día. Si no hay forma de saberlo: día/mes (Colombia).
export function detectDateOrder(values: string[]): DateOrder {
  for (const v of values) {
    const m = v.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    if (!m) continue;
    if (Number(m[1]) > 12) return 'dmy';
    if (Number(m[2]) > 12) return 'mdy';
  }
  return 'dmy';
}

export function parseBankDate(value: string, order: DateOrder = 'dmy'): Date | null {
  const v = value.trim();
  let y: number, mo: number, d: number;
  let m = v.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/);
  if (m) {
    [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else if ((m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/))) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    [d, mo] = order === 'dmy' ? [a, b] : [b, a];
    y = Number(m[3]);
    if (y < 100) y += 2000;
  } else {
    return null;
  }
  const date = new Date(y, mo - 1, d, 12);
  // Rechaza fechas imposibles (31/02 se convertiría en 3 de marzo)
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

// "-1.234,56", "(50.000)", "$ 1,234.56", "1.500-", "COP 25000" → número con signo
export function parseSignedAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  let text = raw.trim();
  if (!text) return null;
  // Negativo: entre paréntesis, con signo menos (antes o después) o marcado "DB"
  const negative = /^\(.*\)$/.test(text) || text.includes('-') || /\bdb\b/i.test(text);
  text = text.replace(/[^\d.,]/g, '');
  if (!text) return null;

  const lastDot = text.lastIndexOf('.');
  const lastComma = text.lastIndexOf(',');
  let normalized: string;
  if (lastDot !== -1 && lastComma !== -1) {
    const dec = lastDot > lastComma ? '.' : ',';
    normalized = text.split(dec === '.' ? ',' : '.').join('').replace(dec, '.');
  } else if (lastDot !== -1 || lastComma !== -1) {
    const sep = lastDot !== -1 ? '.' : ',';
    const parts = text.split(sep);
    const thousands = parts.length > 2 || parts[parts.length - 1].length === 3;
    normalized = thousands ? parts.join('') : parts.join('.');
  } else {
    normalized = text;
  }
  const value = parseFloat(normalized);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

function isDebitKind(value: string): boolean | null {
  const v = normalize(value);
  if (/^(d|db|deb|debito|cargo|egreso|retiro)/.test(v)) return true;
  if (/^(c|cr|cred|credito|abono|ingreso|deposito)/.test(v)) return false;
  return null;
}

// ─── Extracto completo ──────────────────────────────────────

export function parseBankStatement(text: string, manualMapping?: ColumnMapping): ParseResult {
  const rows = parseCsv(text).filter((r) => r.some((c) => c !== ''));
  if (rows.length === 0) return { headers: [], mapping: null, rows: [], skipped: 0 };

  const headerIndex = manualMapping ? findHeaderRowLoose(rows) : findHeaderRow(rows);
  const headers = rows[headerIndex];
  const mapping = manualMapping ?? detectMapping(headers);
  if (!mapping) return { headers, mapping: null, rows: [], skipped: 0 };

  const dataRows = rows.slice(headerIndex + 1);
  const order = detectDateOrder(dataRows.map((r) => r[mapping.date] ?? ''));
  const result: ImportedRow[] = [];
  let skipped = 0;

  dataRows.forEach((cells, i) => {
    const date = parseBankDate(cells[mapping.date] ?? '', order);
    let signed: number | null = null;

    if (mapping.amount !== null) {
      signed = parseSignedAmount(cells[mapping.amount]);
      if (signed !== null && mapping.kind !== null) {
        const debit = isDebitKind(cells[mapping.kind] ?? '');
        if (debit !== null) signed = debit ? -Math.abs(signed) : Math.abs(signed);
      }
    } else if (mapping.debit !== null && mapping.credit !== null) {
      const debit = Math.abs(parseSignedAmount(cells[mapping.debit]) ?? 0);
      const credit = Math.abs(parseSignedAmount(cells[mapping.credit]) ?? 0);
      signed = credit - debit;
    }

    // Filas de totales o vacías: sin fecha o sin monto → se saltan
    if (!date || signed === null || signed === 0) {
      if (cells.some((c) => c !== '')) skipped++;
      return;
    }
    result.push({
      date: date.toISOString(),
      description: (cells[mapping.description] ?? '').replace(/\s+/g, ' ').trim(),
      amount: Math.abs(signed),
      type: signed > 0 ? 'income' : 'expense',
      line: headerIndex + i + 2,
    });
  });

  return { headers, mapping, rows: result, skipped };
}

// Con columnas elegidas a mano: la primera fila con tantas celdas como la
// mayoría de las filas se toma como encabezado
function findHeaderRowLoose(rows: string[][]): number {
  const counts = new Map<number, number>();
  for (const r of rows) counts.set(r.length, (counts.get(r.length) ?? 0) + 1);
  const common = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const idx = rows.findIndex((r) => r.length === common);
  return idx === -1 ? 0 : idx;
}

// ─── Duplicados y categorías ────────────────────────────────

const sameDay = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString();

// Un movimiento importado se considera duplicado si en esa cuenta ya hay
// uno del mismo día, monto y tipo (por ejemplo, al importar dos veces el
// mismo extracto o uno que se cruza con lo que ya anotaste a mano).
export function findDuplicates(
  rows: ImportedRow[],
  existing: Pick<TransactionWithCategory, 'date' | 'amount' | 'type' | 'accountId'>[],
  accountId: string
): Set<number> {
  const pool = existing.filter((t) => t.accountId === accountId);
  const used = new Set<number>();
  const duplicates = new Set<number>();
  rows.forEach((row, i) => {
    const match = pool.findIndex((t, j) =>
      !used.has(j) && t.type === row.type && Math.abs(t.amount - row.amount) < 0.005 && sameDay(t.date, row.date)
    );
    if (match !== -1) { used.add(match); duplicates.add(i); }
  });
  return duplicates;
}

// Reutiliza la categoría de un gasto anterior con la misma descripción
// ("NETFLIX.COM 123" ↔ "Netflix.com 456" cuentan como la misma)
function descriptionKey(text: string): string {
  return normalize(text).replace(/[\d*#]+/g, ' ').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function suggestCategoryFromHistory(
  description: string,
  history: Pick<TransactionWithCategory, 'notes' | 'categoryId' | 'type'>[]
): string | null {
  const key = descriptionKey(description);
  if (key.length < 3) return null;
  const match = history.find((t) => t.type === 'expense' && t.categoryId && descriptionKey(t.notes ?? '') === key);
  return match?.categoryId ?? null;
}

// ─── Codificación ───────────────────────────────────────────
// Muchos bancos exportan en Windows-1252 (Latin-1) en vez de UTF-8: leído
// como UTF-8, "Débito" aparece como "D�bito". En ese caso se decodifican
// los bytes como Windows-1252.
const CP1252_EXTRAS: Record<number, string> = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡', 0x88: 'ˆ',
  0x89: '‰', 0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘', 0x92: '’', 0x93: '“',
  0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—', 0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›',
  0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ',
};

export function decodeWindows1252(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += CP1252_EXTRAS[b] ?? String.fromCharCode(b);
  return out;
}

export function looksMisdecoded(text: string): boolean {
  return text.includes('\uFFFD');
}
