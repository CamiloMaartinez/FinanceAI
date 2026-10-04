// Cálculo de fechas para movimientos recurrentes (salario, arriendo...).
// Funciones puras, sin base de datos, para poder probarlas aisladas.

export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly';

export const RECURRENCE_LABELS: Record<RecurrenceFrequency, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
};

// Máximo de movimientos que se crean de una sola vez al ponerse al día
// (por ejemplo, si la app no se abrió en meses). Evita llenar la base de
// datos por un error de fechas.
export const MAX_CATCH_UP = 24;

// Mediodía local: así un cambio de zona horaria no mueve el día.
export function atLocalNoon(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

// Siguiente fecha después de `from`. Para la frecuencia mensual se usa
// `anchorDay` (el día del mes elegido originalmente) para que un 31 no se
// vaya corriendo: 31 ene → 28 feb → 31 mar, no 28 mar.
export function nextOccurrence(
  from: Date,
  frequency: RecurrenceFrequency,
  anchorDay: number
): Date {
  if (frequency === 'weekly' || frequency === 'biweekly') {
    const next = atLocalNoon(from);
    next.setDate(next.getDate() + (frequency === 'weekly' ? 7 : 14));
    return next;
  }

  const year = from.getMonth() === 11 ? from.getFullYear() + 1 : from.getFullYear();
  const monthIndex = (from.getMonth() + 1) % 12;
  const day = Math.min(anchorDay, daysInMonth(year, monthIndex));
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

// Todas las fechas pendientes (<= now) a partir de `nextDate`, y la
// siguiente fecha futura que queda programada.
export function dueOccurrences(
  nextDate: Date,
  frequency: RecurrenceFrequency,
  anchorDay: number,
  now: Date
): { due: Date[]; next: Date } {
  const due: Date[] = [];
  let cursor = nextDate;

  while (cursor.getTime() <= now.getTime() && due.length < MAX_CATCH_UP) {
    due.push(cursor);
    cursor = nextOccurrence(cursor, frequency, anchorDay);
  }

  // Si se llegó al tope, saltamos hasta el futuro sin crear más movimientos
  while (cursor.getTime() <= now.getTime()) {
    cursor = nextOccurrence(cursor, frequency, anchorDay);
  }

  return { due, next: cursor };
}
