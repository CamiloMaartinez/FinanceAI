// Convierte el monto que llega desde un atajo de Siri / Apple Pay en un
// número. Según el idioma del iPhone puede venir como "$25.000",
// "25.000,50", "25,000.50", "COP 25000" o "25000".
export function parseShortcutAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  let normalized: string;

  if (lastDot !== -1 && lastComma !== -1) {
    // Hay ambos: el que aparece de último es el separador decimal
    const decimalSep = lastDot > lastComma ? '.' : ',';
    const thousandsSep = decimalSep === '.' ? ',' : '.';
    normalized = cleaned.split(thousandsSep).join('').replace(decimalSep, '.');
  } else if (lastDot !== -1 || lastComma !== -1) {
    // Solo uno: si va seguido de exactamente 3 dígitos es de miles ("25.000")
    const sep = lastDot !== -1 ? '.' : ',';
    const parts = cleaned.split(sep);
    const isThousands = parts.length > 2 || parts[parts.length - 1].length === 3;
    normalized = isThousands ? parts.join('') : parts.join('.');
  } else {
    normalized = cleaned;
  }

  const value = parseFloat(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

// ─── Cuenta y categoría por NOMBRE ─────────────────────────
// Un atajo de iPhone no conoce los ids internos: manda el nombre tal como
// lo escribió la persona en "Elegir de la lista" ("Nequi", "alimentacion").

interface Named {
  id: string;
  name: string;
}

/** "Bancolombia *1234" → "bancolombia 1234" (sin tildes, mayúsculas ni signos) */
function simplify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Busca por id o por nombre. Acepta el nombre sin tildes, en minúsculas o
 * incompleto ("bancolombia" → "Bancolombia *1234") siempre que no haya
 * dos opciones posibles.
 */
export function findByName<T extends Named>(value: string | undefined, items: T[]): T | undefined {
  if (!value?.trim()) return undefined;
  const byId = items.find((item) => item.id === value);
  if (byId) return byId;

  const wanted = simplify(value);
  if (!wanted) return undefined;
  const exact = items.filter((item) => simplify(item.name) === wanted);
  if (exact.length === 1) return exact[0];

  const partial = items.filter((item) => {
    const name = simplify(item.name);
    return name.startsWith(wanted) || name.includes(` ${wanted}`) || wanted.startsWith(name);
  });
  return partial.length === 1 ? partial[0] : undefined;
}

export interface ShortcutParams {
  monto?: string;
  nota?: string;
  tipo?: string;
  cuenta?: string;
  destino?: string;
  categoria?: string;
}

export interface ShortcutPrefill {
  amount?: number;
  notes?: string;
  type: 'expense' | 'income' | 'transfer';
  accountId?: string;
  toAccountId?: string;
  categoryId?: string;
}

/** Traduce los parámetros del enlace a datos del formulario */
export function buildShortcutPrefill(
  params: ShortcutParams,
  accounts: Named[],
  categories: Named[]
): ShortcutPrefill {
  const type = params.tipo === 'ingreso' ? 'income' : params.tipo === 'transferencia' ? 'transfer' : 'expense';
  return {
    type,
    amount: parseShortcutAmount(params.monto) ?? undefined,
    notes: params.nota?.trim() || undefined,
    accountId: findByName(params.cuenta, accounts)?.id,
    toAccountId: type === 'transfer' ? findByName(params.destino, accounts)?.id : undefined,
    categoryId: type === 'expense' ? findByName(params.categoria, categories)?.id : undefined,
  };
}

/**
 * Con ?guardar=1 el movimiento se guarda sin abrir el formulario, pero solo
 * si trae todo lo necesario: monto, cuenta y (si es gasto) categoría.
 * Las transferencias siempre pasan por el formulario (pueden ser entre
 * monedas distintas). Devuelve null cuando falta algo.
 */
export function quickSaveInput(
  prefill: ShortcutPrefill,
  categories: Named[],
  now: Date = new Date()
): {
  amount: number; type: 'expense' | 'income'; date: string; accountId: string;
  toAccountId: null; categoryId: string | null; notes: string;
} | null {
  if (prefill.type === 'transfer' || !prefill.amount || !prefill.accountId) return null;
  if (prefill.type === 'expense' && !prefill.categoryId) return null;
  const categoryName = categories.find((c) => c.id === prefill.categoryId)?.name;
  return {
    amount: prefill.amount,
    type: prefill.type,
    date: now.toISOString(),
    accountId: prefill.accountId,
    toAccountId: null,
    categoryId: prefill.type === 'expense' ? prefill.categoryId! : null,
    // La nota es opcional: sin ella el movimiento se llama como su categoría
    notes: prefill.notes ?? categoryName ?? (prefill.type === 'income' ? 'Ingreso' : 'Gasto'),
  };
}
