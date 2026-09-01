export interface MonthProgress {
  dayOfMonth: number;
  daysInMonth: number;
  percentElapsed: number;
}

export function getMonthProgress(date: Date = new Date()): MonthProgress {
  const dayOfMonth = date.getDate();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return {
    dayOfMonth,
    daysInMonth,
    percentElapsed: (dayOfMonth / daysInMonth) * 100,
  };
}

// Proyección lineal simple: si sigues gastando al mismo ritmo que llevas
// hasta hoy, ¿cuánto terminarías gastando al cierre del mes?
export function projectMonthEnd(spentSoFar: number, dayOfMonth: number, daysInMonth: number): number {
  if (dayOfMonth <= 0) return 0;
  return (spentSoFar / dayOfMonth) * daysInMonth;
}
