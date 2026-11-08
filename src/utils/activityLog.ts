import type { ActivityAction, ActivityEntry } from '../database/db';

const VERBS: Record<ActivityAction, string> = {
  crear: 'cread',
  editar: 'editad',
  eliminar: 'eliminad',
  seguridad: '',
  respaldo: '',
};

// Para concordar el género: «Cuenta creada», «Movimiento creado»
const FEMININE = new Set(['Cuenta', 'Meta', 'Suscripción', 'Tarjeta', 'Alerta', 'Deuda']);

/** Título de una entrada del historial: «Movimiento creado», «Cuenta eliminada», «Seguridad»… */
export function describeActivity(entry: Pick<ActivityEntry, 'entity' | 'action'>): string {
  const verb = VERBS[entry.action];
  if (!verb) return entry.entity;
  return `${entry.entity} ${verb}${FEMININE.has(entry.entity) ? 'a' : 'o'}`;
}
