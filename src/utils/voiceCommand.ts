// Entiende frases en español como las que se dictan a Siri o al micrófono
// del teclado y las convierte en una acción de la app:
//
//   "gasté 25 mil en Starbucks con Nequi"          → gasto precargado
//   "recibí 2 millones de salario"                  → ingreso precargado
//   "transfiere 100 mil de Bancolombia a Nequi"     → transferencia precargada
//   "abre presupuestos"                             → navegar a Presupuestos
//
// Es una función pura (sin base de datos ni red): recibe las cuentas y
// categorías del usuario para reconocer sus nombres. Así se prueba fácil y
// funciona sin internet. Nunca guarda nada: solo precarga el formulario y el
// usuario confirma, porque el dictado puede equivocarse.

import { parseShortcutAmount } from './shortcutParams';

export type VoiceTransactionType = 'expense' | 'income' | 'transfer';

export type VoiceCommand =
  | {
      kind: 'transaction';
      type: VoiceTransactionType;
      amount: number | null;
      notes: string;
      accountId?: string;
      toAccountId?: string;
      categoryId?: string;
    }
  | { kind: 'navigate'; route: string; label: string }
  | { kind: 'unknown' };

export interface VoiceContext {
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; subcategories?: string[] }[];
}

const EMPTY_CONTEXT: VoiceContext = { accounts: [], categories: [] };

// ─── Normalización ──────────────────────────────────────────

/** Minúsculas y sin tildes: "Transferí" → "transferi". */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

interface Token {
  original: string; // tal como se dictó (para la nota)
  norm: string;     // sin tildes ni signos (para comparar)
}

function tokenize(text: string): Token[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((original) => ({
      original,
      // Se conservan dígitos, "." y "," para montos como "25.000" o "1,5"
      norm: normalize(original).replace(/[^a-z0-9ñ.,$]/g, '').replace(/^[.,]+|[.,]+$/g, ''),
    }))
    .filter((t) => t.norm.length > 0);
}

// ─── Montos dictados ────────────────────────────────────────

const UNITS: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21,
  veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
  veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28,
  veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60,
  setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100,
  doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500,
  seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700,
  ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
  medio: 0.5, media: 0.5,
};

// Multiplicadores de miles. "lucas" y "barras" son jerga colombiana (= mil).
const THOUSANDS = new Set(['mil', 'k', 'lucas', 'luca', 'barras', 'barra']);
// "palos" también es jerga colombiana (= millón)
const MILLIONS = new Set(['millon', 'millones', 'palo', 'palos', 'm']);

const ARTICLES = new Set(['un', 'una', 'uno', 'medio', 'media']);

type AmountPart =
  | { kind: 'value'; value: number }
  | { kind: 'thousands' }
  | { kind: 'millions' }
  | { kind: 'and' };

/** Interpreta una palabra como parte de un monto (o null si no lo es). */
function amountParts(norm: string): AmountPart[] | null {
  if (norm in UNITS) return [{ kind: 'value', value: UNITS[norm] }];
  if (THOUSANDS.has(norm)) return [{ kind: 'thousands' }];
  if (MILLIONS.has(norm)) return [{ kind: 'millions' }];
  if (norm === 'y') return [{ kind: 'and' }];

  // "25.000", "$25.000", "1,5", "50k", "25mil", "2m"
  const match = norm.match(/^\$?(\d[\d.,]*)(k|mil|m|millones|millon)?$/);
  if (!match) return null;
  const value = parseShortcutAmount(match[1]);
  if (value == null) return null;
  const parts: AmountPart[] = [{ kind: 'value', value }];
  if (match[2]) parts.push(match[2] === 'k' || match[2] === 'mil' ? { kind: 'thousands' } : { kind: 'millions' });
  return parts;
}

/** Suma un tramo de partes: "un millón doscientos mil" → 1.200.000. */
function evaluateAmount(parts: AmountPart[]): number {
  let total = 0;
  let current = 0;
  let lastMultiplier = 0;
  for (const part of parts) {
    if (part.kind === 'value') {
      // "un millón y medio" → medio se refiere al último multiplicador
      if (part.value === 0.5 && current === 0 && lastMultiplier) total += lastMultiplier / 2;
      else current += part.value;
    } else if (part.kind === 'thousands') {
      total += (current || 1) * 1000;
      current = 0;
      lastMultiplier = 1000;
    } else if (part.kind === 'millions') {
      total = (total + (current || 1)) * 1_000_000;
      current = 0;
      lastMultiplier = 1_000_000;
    }
  }
  return total + current;
}

interface AmountMatch { value: number; start: number; end: number } // end exclusivo

/** Busca el monto más grande de la frase y dónde está. */
function findAmount(tokens: Token[]): AmountMatch | null {
  let best: AmountMatch | null = null;
  let i = 0;
  while (i < tokens.length) {
    const first = amountParts(tokens[i].norm);
    // Un tramo no puede empezar con "y" ni con un multiplicador suelto como "m"
    if (!first || first[0].kind === 'and' || (first[0].kind !== 'value' && tokens[i].norm.length < 3)) {
      i++;
      continue;
    }
    const parts: AmountPart[] = [...first];
    let j = i + 1;
    while (j < tokens.length) {
      const next = amountParts(tokens[j].norm);
      if (!next) break;
      // "y" solo une números: "treinta y cinco"
      if (next[0].kind === 'and') {
        const after = j + 1 < tokens.length ? amountParts(tokens[j + 1].norm) : null;
        if (!after || after[0].kind !== 'value') break;
      }
      parts.push(...next);
      j++;
    }
    // "un gasto", "una compra": un artículo suelto no es un monto
    if (j - i === 1 && ARTICLES.has(tokens[i].norm)) {
      i = j;
      continue;
    }
    const value = evaluateAmount(parts.filter((p) => p.kind !== 'and'));
    if (value > 0 && (!best || value > best.value)) best = { value, start: i, end: j };
    i = j;
  }
  return best;
}

// ─── Intención ──────────────────────────────────────────────

const TRANSFER_WORDS = [
  'transfiere', 'transferi', 'transferir', 'transferencia', 'transfiera',
  'pasa', 'pase', 'pasar', 'mueve', 'movi', 'mover', 'envia', 'envie', 'enviar', 'manda', 'mande',
];
const INCOME_WORDS = [
  'recibi', 'recibir', 'ingreso', 'ingresos', 'gane', 'ganancia', 'cobre',
  'pagaron', 'llego', 'llegaron', 'entraron', 'entro', 'consignaron', 'salario', 'sueldo', 'nomina',
];
const EXPENSE_WORDS = [
  'gaste', 'gasto', 'gastos', 'gastar', 'pague', 'pagar', 'pago', 'compre', 'comprar',
  'egreso', 'egresos', 'cobraron', 'salida', 'invite',
];
// Palabras de relleno que no van en la nota
const FILLER = new Set([
  'oye', 'siri', 'hey', 'por', 'favor', 'registra', 'registrar', 'registre', 'anota', 'anotar',
  'anote', 'agrega', 'agregar', 'agregue', 'pon', 'poner', 'crea', 'crear', 'nuevo', 'nueva',
  'un', 'una', 'me', 'hoy', 'pesos', 'peso', 'cop', 'plata', 'smart', 'finance', 'financeai',
]);
// Conectores que no deben quedar al inicio o al final de la nota
const EDGE_STOPWORDS = new Set([
  'en', 'de', 'del', 'por', 'para', 'con', 'el', 'la', 'los', 'las', 'a', 'al', 'y', 'desde', 'hacia', 'que', 'mi', 'mis',
]);
// Preguntas: van al asistente, no se convierten en movimientos
const QUESTION_STARTS = [
  'cuanto', 'cuanta', 'cuantos', 'cuantas', 'cuando', 'que', 'como', 'cual', 'cuales',
  'donde', 'porque', 'puedo', 'deberia', 'estoy', 'tengo', 'es', 'sera',
];

// ─── Navegación ─────────────────────────────────────────────

const NAV_VERBS = ['abre', 'abrir', 'abra', 'ir', 've', 'ver', 'vamos', 'muestra', 'muestrame', 'mostrar', 'llevame', 'entra', 'entrar'];

// Rutas de Expo Router (los grupos "(tabs)" y "(more)" no forman parte de la URL)
const SCREENS: { words: string[]; route: string; label: string }[] = [
  { words: ['inicio', 'home', 'resumen', 'principal'], route: '/', label: 'Inicio' },
  { words: ['movimientos', 'transacciones', 'historial'], route: '/transactions', label: 'Movimientos' },
  { words: ['reportes', 'reporte', 'informes', 'informe', 'graficas', 'estadisticas'], route: '/reports', label: 'Reportes' },
  { words: ['perfil', 'ajustes', 'configuracion'], route: '/profile', label: 'Perfil' },
  { words: ['presupuestos', 'presupuesto'], route: '/budgets', label: 'Presupuestos' },
  { words: ['metas', 'meta', 'ahorros'], route: '/goals', label: 'Metas' },
  { words: ['suscripciones', 'suscripcion'], route: '/subscriptions', label: 'Suscripciones' },
  { words: ['cuentas'], route: '/accounts', label: 'Cuentas' },
  { words: ['tarjetas', 'tarjeta'], route: '/cards', label: 'Tarjetas' },
  { words: ['alertas', 'alerta', 'notificaciones'], route: '/alerts', label: 'Alertas' },
  { words: ['deudas', 'deuda', 'prestamos'], route: '/debts', label: 'Deudas' },
  { words: ['retos', 'reto', 'desafios'], route: '/challenges', label: 'Retos' },
  { words: ['categorias'], route: '/categories', label: 'Categorías' },
  { words: ['asistente', 'ia'], route: '/assistant', label: 'Asistente' },
  { words: ['mas', 'modulos', 'menu'], route: '/more', label: 'Más' },
];

function findScreen(norms: string[]) {
  return SCREENS.find((s) => norms.some((n) => s.words.includes(n)));
}

// ─── Cuentas y categorías ───────────────────────────────────

// Palabras genéricas que no sirven para reconocer una cuenta por sí solas
const GENERIC_ACCOUNT_WORDS = new Set(['cuenta', 'tarjeta', 'ahorros', 'ahorro', 'corriente', 'credito', 'debito', 'de', 'la', 'el', 'mi']);

interface NameMatch { id: string; start: number; end: number }

function nameTokens(name: string): string[] {
  return tokenize(name).map((t) => t.norm);
}

function findSequence(norms: string[], seq: string[], from = 0): number {
  if (seq.length === 0) return -1;
  for (let i = from; i + seq.length <= norms.length; i++) {
    if (seq.every((s, k) => norms[i + k] === s)) return i;
  }
  return -1;
}

/** Cuentas mencionadas en la frase, en orden de aparición. */
function findAccounts(norms: string[], accounts: VoiceContext['accounts']): NameMatch[] {
  const found: NameMatch[] = [];
  for (const account of accounts) {
    const seq = nameTokens(account.name);
    let start = findSequence(norms, seq);
    let length = seq.length;
    if (start === -1) {
      // "Bancolombia Ahorros" se reconoce diciendo solo "Bancolombia"
      const key = seq.find((w) => w.length >= 3 && !GENERIC_ACCOUNT_WORDS.has(w));
      if (key) {
        start = norms.indexOf(key);
        length = 1;
      }
    }
    if (start !== -1 && !found.some((f) => start < f.end && f.start < start + length)) {
      found.push({ id: account.id, start, end: start + length });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

// Pistas comunes para las categorías que trae la app (solo se usan si el
// usuario tiene una categoría con ese nombre)
const CATEGORY_HINTS: Record<string, string[]> = {
  alimentacion: ['comida', 'almuerzo', 'desayuno', 'cena', 'restaurante', 'mercado', 'cafe', 'domicilio', 'rappi', 'hamburguesa', 'pizza', 'starbucks', 'supermercado'],
  transporte: ['uber', 'taxi', 'gasolina', 'bus', 'transmilenio', 'metro', 'didi', 'peaje', 'parqueadero', 'pasaje'],
  entretenimiento: ['cine', 'concierto', 'fiesta', 'juego', 'videojuego', 'bar', 'rumba'],
  salud: ['medico', 'drogueria', 'farmacia', 'medicamentos', 'eps', 'odontologo', 'gimnasio'],
  educacion: ['universidad', 'curso', 'libro', 'libros', 'matricula', 'colegio', 'semestre'],
  tecnologia: ['celular', 'computador', 'audifonos', 'cargador', 'portatil'],
  hogar: ['arriendo', 'luz', 'agua', 'gas', 'internet', 'aseo', 'administracion', 'servicios'],
  viajes: ['vuelo', 'hotel', 'tiquete', 'tiquetes', 'airbnb', 'viaje'],
  suscripciones: ['netflix', 'spotify', 'disney', 'youtube', 'icloud', 'prime', 'hbo'],
  mascotas: ['veterinario', 'concentrado', 'perro', 'gato', 'mascota'],
};

function findCategory(norms: string[], categories: VoiceContext['categories']): string | undefined {
  for (const category of categories) {
    const words = [category.name, ...(category.subcategories ?? [])];
    if (words.some((w) => findSequence(norms, nameTokens(w)) !== -1)) return category.id;
  }
  for (const category of categories) {
    const hints = CATEGORY_HINTS[normalize(category.name)];
    if (hints?.some((h) => norms.includes(h))) return category.id;
  }
  return undefined;
}

// ─── Frase completa ─────────────────────────────────────────

/** ¿La frase es una pregunta? (para mandarla al asistente IA). */
export function isQuestion(text: string): boolean {
  if (/[¿?]/.test(text)) return true;
  const first = tokenize(text).map((t) => t.norm).find((n) => !FILLER.has(n));
  return !!first && QUESTION_STARTS.includes(first);
}

export function parseVoiceCommand(text: string, context: VoiceContext = EMPTY_CONTEXT): VoiceCommand {
  if (!text.trim() || isQuestion(text)) return { kind: 'unknown' };
  const tokens = tokenize(text);
  const norms = tokens.map((t) => t.norm);

  const has = (words: string[]) => norms.some((n) => words.includes(n));
  const isTransfer = has(TRANSFER_WORDS);
  const isIncome = !isTransfer && has(INCOME_WORDS);
  const isExpense = !isTransfer && !isIncome && has(EXPENSE_WORDS);
  const amount = findAmount(tokens);

  // Navegación: "abre presupuestos", o solo "presupuestos" sin monto
  const screen = findScreen(norms);
  const startsWithNavVerb = norms.some((n, i) => i < 3 && NAV_VERBS.includes(n));
  if (screen && (startsWithNavVerb || (!amount && !isTransfer && !isIncome && !isExpense && norms.length <= 2))) {
    return { kind: 'navigate', route: screen.route, label: screen.label };
  }

  // Sin verbo ni monto no hay movimiento que crear
  if (!isTransfer && !isIncome && !isExpense && !amount) return { kind: 'unknown' };
  const type: VoiceTransactionType = isTransfer ? 'transfer' : isIncome ? 'income' : 'expense';

  // Cuentas: en una transferencia, la que va después de "a / para / hacia"
  // es la que recibe; la otra es la que envía
  const accountMatches = findAccounts(norms, context.accounts);
  let accountId: string | undefined;
  let toAccountId: string | undefined;
  for (const match of accountMatches) {
    const before = norms[match.start - 1];
    const isDestination = type === 'transfer' && (before === 'a' || before === 'al' || before === 'para' || before === 'hacia');
    if (isDestination && !toAccountId) toAccountId = match.id;
    else if (!isDestination && !accountId) accountId = match.id;
    else if (type === 'transfer' && !toAccountId && match.id !== accountId) toAccountId = match.id;
  }

  const categoryId = type === 'expense' ? findCategory(norms, context.categories) : undefined;

  // Nota: lo que queda al quitar verbo, monto, cuentas y relleno
  const used = new Set<number>();
  if (amount) for (let i = amount.start; i < amount.end; i++) used.add(i);
  for (const m of accountMatches) {
    for (let i = m.start; i < m.end; i++) used.add(i);
    // y la preposición que la acompaña: "con Nequi", "desde Bancolombia"
    if (m.start > 0 && EDGE_STOPWORDS.has(norms[m.start - 1])) used.add(m.start - 1);
  }
  const verbs = new Set([...TRANSFER_WORDS, ...EXPENSE_WORDS, ...INCOME_WORDS.filter((w) => !['salario', 'sueldo', 'nomina'].includes(w))]);
  norms.forEach((n, i) => {
    if (FILLER.has(n) || verbs.has(n)) used.add(i);
  });
  const rest = tokens.filter((_, i) => !used.has(i));
  while (rest.length && EDGE_STOPWORDS.has(rest[0].norm)) rest.shift();
  while (rest.length && EDGE_STOPWORDS.has(rest[rest.length - 1].norm)) rest.pop();
  const rawNote = rest.map((t) => t.original.replace(/[.,;:!¡]+$/g, '')).join(' ').trim();
  const notes = rawNote ? rawNote.charAt(0).toUpperCase() + rawNote.slice(1) : '';

  return {
    kind: 'transaction',
    type,
    amount: amount ? Math.round(amount.value * 100) / 100 : null,
    notes,
    ...(accountId ? { accountId } : {}),
    ...(toAccountId ? { toAccountId } : {}),
    ...(categoryId ? { categoryId } : {}),
  };
}

const TYPE_PARAM: Record<VoiceTransactionType, string> = {
  expense: 'gasto',
  income: 'ingreso',
  transfer: 'transferencia',
};

/**
 * Parámetros para abrir Movimientos con el formulario precargado
 * (mismo formato que financeai://transactions?monto=...&nota=...).
 */
export function transactionParams(command: Extract<VoiceCommand, { kind: 'transaction' }>): Record<string, string> {
  const params: Record<string, string> = { tipo: TYPE_PARAM[command.type] };
  if (command.amount) params.monto = String(command.amount);
  if (command.notes) params.nota = command.notes;
  if (command.accountId) params.cuenta = command.accountId;
  if (command.toAccountId) params.destino = command.toAccountId;
  if (command.categoryId) params.categoria = command.categoryId;
  return params;
}

/**
 * Para el chat del asistente: ¿la frase es claramente una orden y no una
 * conversación? Solo si empieza con la orden ("gasté 20 mil…", "abre metas")
 * y, si es un movimiento, trae el monto. "Ayúdame, gasté 2 millones" sigue
 * siendo una pregunta para la IA.
 */
export function isDirectCommand(text: string): boolean {
  const command = parseVoiceCommand(text);
  if (command.kind === 'navigate') return true;
  if (command.kind !== 'transaction' || command.amount == null) return false;
  const first = tokenize(text).map((t) => t.norm).find((n) => !FILLER.has(n));
  if (!first) return false;
  return TRANSFER_WORDS.includes(first) || INCOME_WORDS.includes(first)
    || EXPENSE_WORDS.includes(first) || amountParts(first) != null;
}
