// Porcentaje gastado respecto al límite. Puede superar 100 si te pasaste.
export function getBudgetPercent(spent: number, limit: number): number {
  if (limit <= 0) return 0;
  return (spent / limit) * 100;
}

// Semáforo de presupuesto: al revés que en metas — aquí ir "alto" es malo.
// Verde: vas bien (<80%). Naranja: cuidado (80-99%). Rojo: te pasaste (100%+).
export function getBudgetProgressColor(percent: number): string {
  if (percent >= 100) return '#FF3B30'; // Rojo — excedido
  if (percent >= 80) return '#FF9500';  // Naranja — cerca del límite
  return '#34C759';                      // Verde — bajo control
}

export function getBudgetRemaining(spent: number, limit: number): number {
  return Math.max(limit - spent, 0);
}

// Para la barra de progreso: nunca la dejamos pasar del 100% visualmente,
// aunque el porcentaje real (mostrado en texto) sí puede superarlo.
export function getBudgetBarWidth(percent: number): number {
  return Math.min(percent, 100);
}
