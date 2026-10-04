import type { Account, TransactionWithCategory } from '../models/types';

// CSV pensado para abrirse directo en Excel en español (Colombia):
// separador ";" y coma decimal, que es lo que Excel espera con esa
// configuración regional. Google Sheets y Numbers también lo leen.
const SEPARATOR = ';';
const LINE_BREAK = '\r\n';
// Marca UTF-8 (BOM): sin ella Excel muestra "CafÃ©" en vez de "Café"
const UTF8_BOM = '﻿';

const TYPE_LABELS: Record<string, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
  investment: 'Inversión',
  loan: 'Préstamo',
  payment: 'Pago',
  debt_in: 'Deuda (entrada)',
  debt_out: 'Deuda (salida)',
};

export const CSV_HEADERS = ['Fecha', 'Tipo', 'Monto', 'Moneda', 'Cuenta', 'Cuenta destino', 'Categoría', 'Nota'];

// Un texto que empieza con = + - @ se ejecuta como fórmula al abrirlo en
// Excel ("inyección CSV"). Las notas pueden venir de fuera (comercio de
// Apple Pay, recibo escaneado), así que se anteponen con un apóstrofo.
export function escapeCsvText(value: string | null | undefined): string {
  let text = value ?? '';
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[";\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

// 25000 → "25000"; 12.5 → "12,5". Sin separador de miles para que Excel
// lo reconozca como número.
export function formatCsvNumber(value: number): string {
  return String(Math.round(value * 100) / 100).replace('.', ',');
}

// Fecha local en formato AAAA-MM-DD, que Excel reconoce y ordena bien
export function formatCsvDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function buildTransactionsCsv(
  transactions: TransactionWithCategory[],
  accounts: Account[]
): string {
  const currencyOf = (accountId: string) =>
    accounts.find((a) => a.id === accountId)?.currency ?? 'COP';

  const rows = transactions.map((tx) => [
    formatCsvDate(tx.date),
    TYPE_LABELS[tx.type] ?? tx.type,
    formatCsvNumber(tx.amount),
    currencyOf(tx.accountId),
    escapeCsvText(tx.accountName),
    escapeCsvText(tx.type === 'transfer' ? tx.toAccountName : ''),
    escapeCsvText(tx.categoryName),
    escapeCsvText(tx.notes),
  ].join(SEPARATOR));

  return UTF8_BOM + [CSV_HEADERS.join(SEPARATOR), ...rows].join(LINE_BREAK) + LINE_BREAK;
}
