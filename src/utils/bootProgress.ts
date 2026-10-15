// Pasos reales del arranque que mueve la barra del splash (I2). El orden es
// el de app/_layout.tsx; las fuentes cargan en paralelo y cuentan igual.
export const BOOT_STEPS = [
  'perfil',
  'baseDeDatos',
  'recurrentes',
  'suscripciones',
  'alertas',
  'fuentes',
] as const;

export type BootStep = (typeof BOOT_STEPS)[number];

/** Fracción del arranque terminada (0 a 1), sin contar pasos repetidos ni desconocidos. */
export function bootProgress(done: readonly BootStep[]): number {
  const unique = new Set(done.filter((step) => BOOT_STEPS.includes(step)));
  return unique.size / BOOT_STEPS.length;
}

/**
 * Lo que debe mostrar la barra: el avance real, pero sin llegar a 100 hasta
 * que la app esté lista de verdad (quedan pasos cortos después de las alertas).
 */
export function splashTarget(progress: number, ready: boolean): number {
  if (ready) return 1;
  return Math.min(Math.max(progress, 0), 0.95);
}

/** "000" a "100", como el contador de la pantalla de carga. */
export function formatSplashCount(fraction: number): string {
  'worklet';
  const n = Math.round(Math.min(Math.max(fraction, 0), 1) * 100);
  return n < 10 ? `00${n}` : n < 100 ? `0${n}` : `${n}`;
}
