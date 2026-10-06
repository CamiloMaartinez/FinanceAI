// Cálculos del pull-to-refresh de Inicio. Son worklets puros: corren en el
// hilo de UI en cada cuadro del gesto y se prueban sin pantalla.

/** Cuánto se ha llenado la moneda: 0 sin jalar, 1 al llegar al umbral. */
export function pullProgress(distance: number, threshold: number): number {
  'worklet';
  if (threshold <= 0) return 0;
  return Math.min(Math.max(distance / threshold, 0), 1);
}

/** Al soltar: recarga solo si se pasó el umbral y no hay otra recarga en curso. */
export function shouldRefresh(distance: number, threshold: number, isRefreshing: boolean): boolean {
  'worklet';
  return !isRefreshing && distance >= threshold;
}

/**
 * Cuánto hay que bajar el contenido con translateY para que el hueco de la
 * moneda mida max(hold, jalado). En iOS parte del jalón ya lo pone el rebote
 * nativo del scroll (`native`), así que solo se suma lo que falta: mientras
 * el scroll rebota hacia 0, el contenido no salta.
 */
export function pullOffset(native: number, gesture: number, hold: number): number {
  'worklet';
  const pulled = Math.max(native, 0) + Math.max(gesture, 0);
  return Math.max(hold, pulled) - Math.max(native, 0);
}
