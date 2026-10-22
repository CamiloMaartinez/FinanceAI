// Lectura de los mensajes que mandan los bancos (SMS, notificación o correo)
// cuando hay una compra, un pago o una transferencia:
//
//   "Bancolombia: Compraste $45.900,00 en EXITO CALLE 80 con tu T.Deb *1234,
//    el 12/10/2026 a las 15:32."
//
// Cada banco usa siempre la misma plantilla y solo cambian el monto, el
// comercio y la fecha. En lugar de una plantilla por banco, se buscan las
// piezas comunes a todos: el monto ($ o COP), la palabra que dice qué pasó
// (compraste, recibiste, transferiste...), el comercio o la persona, los
// últimos dígitos de la cuenta y la fecha.
//
// Funciones puras (sin base de datos) para poder probarlas con ejemplos.

import type { Account, TransactionWithCategory } from '../models/types';
import { parseShortcutAmount } from './shortcutParams';
import { suggestCategoryFromHistory } from './csvImport';

export interface ParsedBankMessage {
  amount: number;
  currency: 'COP' | 'USD';
  /** Sale dinero (expense) o entra dinero (income). */
  type: 'expense' | 'income';
  /** Compra, pago, transferencia o retiro: sirve para escribir la nota. */
  kind: 'purchase' | 'payment' | 'transfer' | 'withdrawal' | 'deposit';
  /** Comercio o persona ("Exito Calle 80", "Juan Perez"). */
  counterparty: string | null;
  /** Banco o billetera que envió el mensaje ("Bancolombia", "Nequi"). */
  bank: string | null;
  /** Últimos dígitos de la cuenta o tarjeta propia ("1234"). */
  accountDigits: string | null;
  /** Últimos dígitos de la cuenta destino en una transferencia. */
  targetDigits: string | null;
  /** El mensaje habla de tarjeta de crédito. */
  isCreditCard: boolean;
  /** Fecha del mensaje (ISO) o null si no la trae. */
  date: string | null;
}

// ─── Texto ──────────────────────────────────────────────────

// Minúsculas y sin tildes, SIN cambiar el largo del texto: así una posición
// encontrada en el texto normalizado sirve para cortar el original.
function fold(text: string): string {
  let out = '';
  for (const ch of text) {
    const base = ch.normalize('NFD')[0] ?? ch;
    // Caracteres que ocupan dos posiciones (emojis) se reemplazan por dos
    out += ch.length === 2 ? '  ' : base.toLowerCase();
  }
  return out;
}

function titleCase(text: string): string {
  // Solo si viene todo en MAYÚSCULAS (como lo escriben los bancos)
  if (text !== text.toUpperCase()) return text;
  return text.toLowerCase().replace(/(^|[\s&/-])([a-záéíóúñü])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

// ─── Qué pasó ───────────────────────────────────────────────

type Kind = ParsedBankMessage['kind'];
const KEYWORDS: { words: string[]; type: 'expense' | 'income'; kind: Kind }[] = [
  {
    type: 'income', kind: 'deposit',
    words: [
      'recibiste', 'te enviaron', 'te envio', 'te consignaron', 'te transfirieron', 'te llego', 'te llegaron',
      'has recibido', 'ha recibido', 'recibio', 'pago recibido', 'transferencia recibida',
      'abono', 'abonaron', 'consignacion', 'consignaron', 'deposito', 'reintegro', 'devolucion',
    ],
  },
  {
    type: 'expense', kind: 'transfer',
    words: ['transferiste', 'enviaste', 'envio de dinero', 'envio', 'transferencia', 'transfirio'],
  },
  { type: 'expense', kind: 'withdrawal', words: ['retiraste', 'retiro', 'avance'] },
  { type: 'expense', kind: 'payment', words: ['pagaste', 'pago', 'pse', 'debito automatico', 'cobro', 'cargo'] },
  { type: 'expense', kind: 'purchase', words: ['compraste', 'compra', 'debito', 'debitamos'] },
];

// Mensajes que no movieron dinero: compra rechazada, código de seguridad...
const NOT_A_MOVEMENT = /\b(rechazad[ao]|declinad[ao]|no exitos[ao]|no fue aprobad[ao]|fallid[ao]|clave dinamica|codigo de (verificacion|seguridad)|otp)\b/;

function detectKind(folded: string): { type: 'expense' | 'income'; kind: Kind; end: number } | null {
  // Gana la palabra que aparece primero; si empiezan igual, la más larga
  // ("pago recibido" le gana a "pago").
  let best: { type: 'expense' | 'income'; kind: Kind; index: number; length: number } | null = null;
  for (const group of KEYWORDS) {
    for (const word of group.words) {
      const m = new RegExp(`\\b${word}\\b`).exec(folded);
      if (!m) continue;
      if (!best || m.index < best.index || (m.index === best.index && word.length > best.length)) {
        best = { type: group.type, kind: group.kind, index: m.index, length: word.length };
      }
    }
  }
  return best && { type: best.type, kind: best.kind, end: best.index + best.length };
}

// ─── Monto ──────────────────────────────────────────────────

const AMOUNT = /(us\$|\busd|\$|\bcop|\bvalor(?: de)?|\bpor)\s*\$?\s*(\d[\d.,]*\d|\d)/g;

function findAmount(folded: string): { amount: number; currency: 'COP' | 'USD'; index: number } | null {
  for (const m of folded.matchAll(AMOUNT)) {
    const prefix = m[1];
    // "por" y "valor" solo cuentan si el número parece un monto (no "por 2 cuotas")
    const amount = parseShortcutAmount(m[2]);
    if (!amount) continue;
    if ((prefix === 'por' || prefix.startsWith('valor')) && amount < 100) continue;
    const currency = prefix === 'us$' || prefix === 'usd' ? 'USD' : 'COP';
    return { amount, currency, index: m.index ?? 0 };
  }
  return null;
}

// ─── Comercio o persona ─────────────────────────────────────

// Dónde termina el nombre: "con tu tarjeta", "el 12/10", "a las 3:30", "*1234"...
const STOP = String.raw`(?=\s+(?:con|desde|el|del|por|a las|en tu|en su|en la cuenta|tu|su|t\.?\s?cred\w*|t\.?\s?deb\w*|tarjeta|cta|cuenta|valor|hora|fecha|referencia|ref|aprobacion|si no|inquietudes)\b|\s+\d{1,2}[:/]\d{2}|\s+\$|\s*\*|\s*[!?¡¿]|\s*[.,;:](?:\s|$)|\s*$)`;
// En una compra el comercio va tras "en"; en una transferencia la persona
// va tras "a"; en un ingreso, tras "de".
const PREPOSITIONS: Record<Kind, string[]> = {
  purchase: ['en', 'a'],
  payment: ['a', 'en'],
  withdrawal: ['en'],
  transfer: ['a', 'en'],
  deposit: ['de', 'desde'],
};
// Lo que sigue a la preposición y NO es un nombre
const NOT_A_NAME = /^(tu|su|la|las|los|el|cuenta|cta|tarjeta|t\.|\$|\d)/;

function findCounterparty(original: string, folded: string, kind: Kind, from: number): string | null {
  for (const prep of PREPOSITIONS[kind]) {
    const re = new RegExp(String.raw`\b${prep}\s+([^\s$*][^\n]{0,60}?)${STOP}`, 'g');
    re.lastIndex = from;
    let m: RegExpExecArray | null;
    while ((m = re.exec(folded))) {
      const start = m.index + m[0].length - m[1].length;
      if (NOT_A_NAME.test(m[1])) { re.lastIndex = m.index + 1; continue; }
      const name = original.slice(start, start + m[1].length).replace(/\s+/g, ' ').trim();
      if (name.length >= 2) return titleCase(name);
      re.lastIndex = m.index + 1;
    }
  }
  return null;
}

// ─── Banco, cuenta y fecha ──────────────────────────────────

const BANKS: [RegExp, string][] = [
  [/\bbancolombia\b/, 'Bancolombia'],
  [/\bnequi\b/, 'Nequi'],
  [/\bdaviplata\b/, 'DaviPlata'],
  [/\bdavivienda\b/, 'Davivienda'],
  [/\bbbva\b/, 'BBVA'],
  [/\bbanco de bogota\b|\bbco de bogota\b/, 'Banco de Bogotá'],
  [/\bbanco de occidente\b|\boccidente\b/, 'Banco de Occidente'],
  [/\bbanco popular\b/, 'Banco Popular'],
  [/\bav ?villas\b/, 'AV Villas'],
  [/\bscotiabank\b|\bcolpatria\b/, 'Scotiabank Colpatria'],
  [/\bcaja social\b/, 'Banco Caja Social'],
  [/\bfalabella\b/, 'Banco Falabella'],
  [/\bitau\b/, 'Itaú'],
  [/\blulo\b/, 'Lulo Bank'],
  [/\brappipay\b|\brappi pay\b/, 'RappiPay'],
  [/\bmovii\b/, 'Movii'],
  [/\bnu\b|\bnubank\b/, 'Nu'],
];

function detectBank(folded: string): string | null {
  // El que aparezca primero (el remitente suele ir al inicio)
  let best: { index: number; name: string } | null = null;
  for (const [re, name] of BANKS) {
    const m = re.exec(folded);
    if (m && (!best || m.index < best.index)) best = { index: m.index, name };
  }
  return best?.name ?? null;
}

const DIGITS = /(?:\*+\s?|terminad[ao] en\s+|termina en\s+|finalizad[ao] en\s+|no\.?\s+|#)(\d{3,4})\b/g;

function findDigits(folded: string): { own: string | null; target: string | null } {
  const all = [...folded.matchAll(DIGITS)].map((m) => ({ digits: m[1], index: m.index ?? 0 }));
  if (all.length === 0) return { own: null, target: null };
  // La cuenta propia es la que va después de "tu"/"su"; si no se dice, la primera
  const ownRe = /\b(?:tu|su|desde)\b/g;
  let own = all[0];
  for (const m of folded.matchAll(ownRe)) {
    const next = all.find((d) => d.index > (m.index ?? 0) && d.index - (m.index ?? 0) < 40);
    if (next) { own = next; break; }
  }
  const target = all.find((d) => d !== own) ?? null;
  return { own: own.digits, target: target?.digits ?? null };
}

function findDate(folded: string, now: Date): string | null {
  const d = /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/.exec(folded);
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(folded);
  const t = /\b(\d{1,2}):(\d{2})(?::\d{2})?\s*(a\.?\s?m\.?|p\.?\s?m\.?)?/.exec(folded);

  let year: number, month: number, day: number;
  if (iso) {
    [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (d) {
    day = Number(d[1]);
    month = Number(d[2]);
    year = d[3] ? Number(d[3]) : now.getFullYear();
    if (year < 100) year += 2000;
  } else {
    return null;
  }

  let hours = 12, minutes = 0;
  if (t) {
    hours = Number(t[1]);
    minutes = Number(t[2]);
    const meridiem = t[3]?.replace(/[.\s]/g, '');
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    if (hours > 23 || minutes > 59) { hours = 12; minutes = 0; }
  }

  const date = new Date(year, month - 1, day, hours, minutes);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  // Una fecha en el futuro es un error de lectura (o el día de corte de la tarjeta)
  if (date.getTime() - now.getTime() > 24 * 60 * 60 * 1000) return null;
  return date.toISOString();
}

// ─── Mensaje completo ───────────────────────────────────────

/**
 * Lee un mensaje del banco. Devuelve null si no es un movimiento de dinero
 * (códigos de seguridad, compras rechazadas, publicidad sin monto...).
 */
export function parseBankMessage(text: string | undefined, now: Date = new Date()): ParsedBankMessage | null {
  if (!text) return null;
  const original = text.replace(/\s+/g, ' ').trim();
  if (!original) return null;
  const folded = fold(original);
  if (NOT_A_MOVEMENT.test(folded)) return null;

  const found = findAmount(folded);
  const kind = detectKind(folded);
  if (!found || !kind) return null;

  const counterparty = findCounterparty(original, folded, kind.kind, Math.min(kind.end, found.index));
  const { own, target } = findDigits(folded);

  return {
    amount: found.amount,
    currency: found.currency,
    type: kind.type,
    kind: kind.kind,
    counterparty,
    bank: detectBank(folded),
    accountDigits: own,
    targetDigits: kind.kind === 'transfer' ? target : null,
    isCreditCard: /\bt\.?\s?cred|\btarjeta de credito\b|\btc\b/.test(folded),
    date: findDate(folded, now),
  };
}

// ─── Cuenta y categoría ─────────────────────────────────────

/**
 * Busca a qué cuenta propia pertenece el mensaje. Para que funcione con
 * varias cuentas del mismo banco, basta con que el nombre de la cuenta
 * lleve los últimos dígitos: "Bancolombia *1234" o "Ahorros 1234".
 */
export function matchAccount(
  digits: string | null,
  bank: string | null,
  isCreditCard: boolean,
  accounts: Pick<Account, 'id' | 'name' | 'type' | 'isActive'>[]
): string | null {
  let best: { id: string; score: number } | null = null;
  const bankKey = bank ? fold(bank) : null;
  for (const acc of accounts) {
    if (!acc.isActive) continue;
    const name = fold(acc.name);
    let score = 0;
    if (digits && new RegExp(`(^|\\D)${digits}(\\D|$)`).test(name)) score += 5;
    if (bankKey && name.includes(bankKey)) score += 3;
    if (score > 0 && isCreditCard) score += acc.type === 'credit' ? 1 : -1;
    if (score >= 3 && (!best || score > best.score)) best = { id: acc.id, score };
  }
  return best?.id ?? null;
}

const KIND_LABEL: Record<Kind, string> = {
  purchase: 'Compra',
  payment: 'Pago',
  transfer: 'Transferencia',
  withdrawal: 'Retiro',
  deposit: 'Ingreso',
};

/** Nota corta para el movimiento: el comercio, o qué pasó si no se sabe. */
export function describeBankMessage(msg: ParsedBankMessage): string {
  if (msg.kind === 'transfer') return msg.counterparty ? `Transferencia a ${msg.counterparty}` : 'Transferencia';
  if (msg.type === 'income') return msg.counterparty ? `Transferencia de ${msg.counterparty}` : 'Ingreso';
  if (msg.counterparty) return msg.counterparty;
  return msg.bank ? `${KIND_LABEL[msg.kind]} ${msg.bank}` : KIND_LABEL[msg.kind];
}

export interface BankMessagePrefill {
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  notes: string;
  accountId?: string;
  toAccountId?: string;
  categoryId?: string;
  date?: string;
}

/**
 * Convierte el mensaje en los datos con los que se abre el formulario.
 * - Cuenta: por los últimos dígitos o el nombre del banco.
 * - Transferencia a una cuenta propia: queda como transferencia entre cuentas.
 * - Categoría: la misma que usaste la última vez en ese comercio (el banco
 *   siempre manda el mismo nombre, así que aprende de lo que ya registraste).
 */
export function buildPrefillFromMessage(
  msg: ParsedBankMessage,
  accounts: Pick<Account, 'id' | 'name' | 'type' | 'isActive'>[],
  history: Pick<TransactionWithCategory, 'notes' | 'categoryId' | 'type'>[]
): BankMessagePrefill {
  const accountId = matchAccount(msg.accountDigits, msg.bank, msg.isCreditCard, accounts) ?? undefined;
  const notes = describeBankMessage(msg);

  if (msg.kind === 'transfer') {
    const others = accounts.filter((a) => a.id !== accountId);
    const toAccountId =
      matchAccount(msg.targetDigits, null, false, others) ??
      (msg.counterparty ? matchAccount(null, msg.counterparty, false, others) : null);
    if (toAccountId) {
      return { type: 'transfer', amount: msg.amount, notes, accountId, toAccountId, date: msg.date ?? undefined };
    }
  }

  const categoryId = msg.type === 'expense'
    ? suggestCategoryFromHistory(notes, history) ?? undefined
    : undefined;
  return { type: msg.type, amount: msg.amount, notes, accountId, categoryId, date: msg.date ?? undefined };
}
