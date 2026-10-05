// Presupuesto sugerido: el promedio de gasto de los últimos meses (calculado
// en la app, sin internet) y la validación de lo que propone la IA. Lo usan
// tanto la app como el servidor (app/api/suggest-budget+api.ts).

export interface BudgetHistory {
  monthsAnalyzed: number;
  monthlyIncome: number; // promedio mensual
  categories: { categoryId: string; name: string; monthlyAverage: number }[];
}

export interface BudgetSuggestion {
  totalLimit: number;
  categoryLimits: Record<string, number>;
  explanation: string;
  source: 'ai' | 'baseline';
}

// Redondea hacia arriba a miles: 187.350 → 188.000
export function roundUpToThousand(value: number): number {
  return Math.ceil(value / 1000) * 1000;
}

// Promedio por categoría de varios meses. Divide entre los meses que tienen
// algún gasto, para no subestimar el promedio de alguien que lleva poco
// tiempo usando la app.
export function averageCategorySpending(
  months: { income: number; categories: { categoryId: string; name: string; total: number }[] }[]
): BudgetHistory {
  const withData = months.filter((m) => m.categories.some((c) => c.total > 0) || m.income > 0);
  const count = Math.max(withData.length, 1);
  const totals = new Map<string, { name: string; total: number }>();
  for (const m of withData) {
    for (const c of m.categories) {
      const prev = totals.get(c.categoryId);
      totals.set(c.categoryId, { name: c.name, total: (prev?.total ?? 0) + c.total });
    }
  }
  return {
    monthsAnalyzed: withData.length,
    monthlyIncome: withData.reduce((s, m) => s + m.income, 0) / count,
    categories: [...totals.entries()]
      .map(([categoryId, v]) => ({ categoryId, name: v.name, monthlyAverage: v.total / count }))
      .filter((c) => c.monthlyAverage > 0)
      .sort((a, b) => b.monthlyAverage - a.monthlyAverage),
  };
}

// Respaldo sin IA: limitar cada categoría a su promedio actual
export function baselineSuggestion(history: BudgetHistory): BudgetSuggestion {
  const categoryLimits: Record<string, number> = {};
  for (const c of history.categories) categoryLimits[c.categoryId] = roundUpToThousand(c.monthlyAverage);
  const totalLimit = Object.values(categoryLimits).reduce((s, v) => s + v, 0);
  return {
    totalLimit,
    categoryLimits,
    explanation: `Basado en tu gasto promedio de ${history.monthsAnalyzed === 1 ? 'el último mes' : `los últimos ${history.monthsAnalyzed} meses`}. Ajusta las categorías donde quieras ahorrar.`,
    source: 'baseline',
  };
}

// Valida la respuesta de la IA: solo categorías que existen, montos
// positivos y razonables, y un total que alcance para las categorías. Si
// algo no cuadra, devuelve el respaldo.
export function sanitizeBudgetSuggestion(raw: unknown, history: BudgetHistory): BudgetSuggestion {
  const fallback = baselineSuggestion(history);
  const data = raw as { totalLimit?: unknown; categoryLimits?: unknown; explanation?: unknown } | null;
  if (!data || typeof data !== 'object' || typeof data.categoryLimits !== 'object' || !data.categoryLimits) {
    return fallback;
  }

  const allowed = new Map(history.categories.map((c) => [c.categoryId, c.monthlyAverage]));
  const categoryLimits: Record<string, number> = {};
  for (const [id, value] of Object.entries(data.categoryLimits as Record<string, unknown>)) {
    const average = allowed.get(id);
    const amount = typeof value === 'number' ? value : Number(value);
    // Descarta categorías inventadas y montos absurdos (más del triple del promedio)
    if (average === undefined || !Number.isFinite(amount) || amount <= 0 || amount > average * 3) continue;
    categoryLimits[id] = roundUpToThousand(amount);
  }
  if (Object.keys(categoryLimits).length === 0) return fallback;

  const sum = Object.values(categoryLimits).reduce((s, v) => s + v, 0);
  const proposedTotal = typeof data.totalLimit === 'number' ? data.totalLimit : Number(data.totalLimit);
  const totalLimit = Number.isFinite(proposedTotal) && proposedTotal >= sum ? roundUpToThousand(proposedTotal) : sum;
  const explanation = typeof data.explanation === 'string' && data.explanation.trim()
    ? data.explanation.trim().slice(0, 600)
    : fallback.explanation;

  return { totalLimit, categoryLimits, explanation, source: 'ai' };
}

// Extrae el primer objeto JSON de un texto (la IA a veces lo envuelve en
// ```json ... ``` o agrega una frase antes)
export function extractJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}
