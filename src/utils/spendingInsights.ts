// Detección de gasto inusual por categoría, comparando con el propio
// historial del usuario. Funciones puras: las usan las notificaciones
// (services/alertEngine.ts) y la pantalla de Alertas.

export interface CategoryInsight {
  categoryId: string;
  categoryName: string;
  kind: 'over' | 'pace';   // over: ya superó; pace: a este ritmo lo superará
  spent: number;           // lo que lleva este mes
  average: number;         // promedio mensual de los meses anteriores
  projected: number;       // proyección a fin de mes al ritmo actual
  percentOver: number;     // % sobre el promedio (de lo gastado o de lo proyectado)
  remainingToAverage: number; // lo que puede gastar sin pasar su promedio (0 si ya lo pasó)
}

const UNUSUAL_RATIO = 1.6;      // 60% más que el promedio
const MIN_DIFFERENCE = 25_000;  // ignora diferencias pequeñas
const MIN_DAY_FOR_PACE = 7;     // antes de esto, una sola compra distorsiona el ritmo
const MIN_AVERAGE_FOR_PACE = 50_000; // en categorías pequeñas el ritmo no es relevante

export function analyzeCategory(params: {
  categoryId: string;
  categoryName: string;
  spent: number;
  history: number[];           // gasto de los meses anteriores (solo meses con gasto)
  dayOfMonth: number;
  daysInMonth: number;
}): CategoryInsight | null {
  const { spent, history, dayOfMonth, daysInMonth } = params;
  // Al menos 2 meses de referencia: evita falsas alarmas en categorías nuevas
  if (history.length < 2 || spent <= 0) return null;

  const average = history.reduce((s, v) => s + v, 0) / history.length;
  if (average <= 0) return null;
  const projected = (spent / dayOfMonth) * daysInMonth;
  const base = {
    categoryId: params.categoryId,
    categoryName: params.categoryName,
    spent,
    average,
    projected,
    remainingToAverage: Math.max(average - spent, 0),
  };

  if (spent >= average * UNUSUAL_RATIO && spent - average >= MIN_DIFFERENCE) {
    return { ...base, kind: 'over', percentOver: Math.round((spent / average - 1) * 100) };
  }

  const onPace = dayOfMonth >= MIN_DAY_FOR_PACE
    && average >= MIN_AVERAGE_FOR_PACE
    && projected >= average * UNUSUAL_RATIO
    && projected - average >= MIN_DIFFERENCE
    && spent >= average * 0.5; // ya gastó al menos la mitad de un mes normal
  if (onPace) {
    return { ...base, kind: 'pace', percentOver: Math.round((projected / average - 1) * 100) };
  }
  return null;
}

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

export function describeInsight(insight: CategoryInsight): { title: string; body: string } {
  if (insight.kind === 'over') {
    return {
      title: `Gasto inusual en ${insight.categoryName}`,
      body: `Llevas ${money(insight.spent)} este mes, ${insight.percentOver}% más que tu promedio de ${money(insight.average)}.`,
    };
  }
  return {
    title: `Vas rápido en ${insight.categoryName}`,
    body: `A este ritmo cerrarías el mes en ${money(insight.projected)}, ${insight.percentOver}% más que tu promedio de ${money(insight.average)}. ${insight.remainingToAverage > 0 ? `Te quedan ${money(insight.remainingToAverage)} para no pasarte.` : 'Ya pasaste tu promedio de un mes normal.'}`,
  };
}

// Todas las categorías con algo para avisar, de la más alarmante a la menos
export function analyzeMonth(params: {
  current: { categoryId: string; categoryName: string; total: number }[];
  pastMonths: { categoryId: string; total: number }[][];
  today: Date;
}): CategoryInsight[] {
  const dayOfMonth = params.today.getDate();
  const daysInMonth = new Date(params.today.getFullYear(), params.today.getMonth() + 1, 0).getDate();
  return params.current
    .map((c) => analyzeCategory({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      spent: c.total,
      history: params.pastMonths
        .map((m) => m.find((x) => x.categoryId === c.categoryId)?.total ?? 0)
        .filter((v) => v > 0),
      dayOfMonth,
      daysInMonth,
    }))
    .filter((x): x is CategoryInsight => x !== null)
    .sort((a, b) => b.percentOver - a.percentOver);
}
