import type { MascotPose } from '../components/mascot/poses';

/**
 * Recorrido personalizado de bienvenida (modelo puro, sin React).
 *
 * El usuario elige qué quiere lograr y aquí se decide qué servicios de la
 * app le mostramos y en qué orden. Vive aparte de la pantalla para poder
 * probarlo sin renderizar nada.
 */

export type InterestId = 'gastos' | 'ahorro' | 'deudas' | 'suscripciones' | 'inversion' | 'ia';

export interface Interest {
  id: InterestId;
  label: string;
  /** Nombre de Ionicons. */
  icon: string;
}

/** Opciones de "¿Qué quieres lograr?", en el orden en que se muestran. */
export const INTERESTS: Interest[] = [
  { id: 'gastos',        label: 'Controlar mis gastos',      icon: 'pie-chart-outline' },
  { id: 'ahorro',        label: 'Ahorrar para una meta',     icon: 'trophy-outline' },
  { id: 'deudas',        label: 'Salir de deudas',           icon: 'people-outline' },
  { id: 'suscripciones', label: 'Ordenar mis suscripciones', icon: 'repeat-outline' },
  { id: 'inversion',     label: 'Empezar a invertir',        icon: 'trending-up-outline' },
  { id: 'ia',            label: 'Decidir mejor con IA',      icon: 'sparkles-outline' },
];

export type FeatureId =
  | 'movimientos'
  | 'presupuestos'
  | 'metas'
  | 'deudas'
  | 'suscripciones'
  | 'inversiones'
  | 'informes'
  | 'asistente'
  | 'seguridad';

export interface Feature {
  id: FeatureId;
  pose: MascotPose;
  /** Nombre de Ionicons para la tarjeta del resumen final. */
  icon: string;
  title: string;
  description: string;
  /** Dónde encontrarlo dentro de la app. */
  where: string;
  /** Primer paso sugerido, para el resumen final. */
  firstStep: string;
}

export const FEATURES: Record<FeatureId, Feature> = {
  movimientos: {
    id: 'movimientos',
    pose: 'senalando',
    icon: 'swap-vertical-outline',
    title: 'Registra en segundos',
    description: 'Anota ingresos y gastos con el teclado rápido, escanea un recibo con la cámara o importa el extracto de tu banco.',
    where: 'Inicio, botón +',
    firstStep: 'Registra tu primer movimiento',
  },
  presupuestos: {
    id: 'presupuestos',
    pose: 'protegiendo',
    icon: 'wallet-outline',
    title: 'Presupuestos que te cuidan',
    description: 'Pon un límite al mes y por categoría. Te avisamos antes de que te pases, no después.',
    where: 'Más, Presupuestos',
    firstStep: 'Define tu presupuesto del mes',
  },
  metas: {
    id: 'metas',
    pose: 'corriendo',
    icon: 'trophy-outline',
    title: 'Metas de ahorro',
    description: 'Ponle nombre y fecha a lo que sueñas. Programa abonos automáticos y mira cuánto te falta.',
    where: 'Más, Metas',
    firstStep: 'Crea tu primera meta',
  },
  deudas: {
    id: 'deudas',
    pose: 'aprobando',
    icon: 'people-outline',
    title: 'Deudas bajo control',
    description: 'Lleva lo que debes y lo que te deben, registra abonos y recibe recordatorios antes de cada fecha.',
    where: 'Más, Deudas y préstamos',
    firstStep: 'Anota tus deudas actuales',
  },
  suscripciones: {
    id: 'suscripciones',
    pose: 'investigando',
    icon: 'repeat-outline',
    title: 'Suscripciones a la vista',
    description: 'Ve cuánto pagas al mes por servicios, cuándo es el próximo cobro y cuáles podrías cancelar.',
    where: 'Más, Suscripciones',
    firstStep: 'Agrega tus suscripciones',
  },
  inversiones: {
    id: 'inversiones',
    pose: 'senalando',
    icon: 'layers-outline',
    title: 'Tarjetas e inversiones',
    description: 'Compara tarjetas, CDT y fondos con ejemplos claros, y elige la opción que va con tu bolsillo.',
    where: 'Más, Tarjetas e Inversiones',
    firstStep: 'Compara opciones para invertir',
  },
  informes: {
    id: 'informes',
    pose: 'investigando',
    icon: 'bar-chart-outline',
    title: 'Informes claros',
    description: 'Gráficas por categoría y por mes, comparación con meses anteriores y exportación a PDF o CSV.',
    where: 'Pestaña Informes',
    firstStep: 'Revisa tu informe del mes',
  },
  asistente: {
    id: 'asistente',
    pose: 'celebrando',
    icon: 'sparkles-outline',
    title: 'Un asistente con IA',
    description: 'Pregúntale por tus finanzas, evalúa si puedes comprar algo y recibe un resumen cada lunes.',
    where: 'Más, Asistente IA',
    firstStep: 'Hazle una pregunta al asistente',
  },
  seguridad: {
    id: 'seguridad',
    pose: 'protegiendo',
    icon: 'lock-closed-outline',
    title: 'Tus datos, en tu teléfono',
    description: 'Todo se guarda en tu dispositivo. Protégelo con Face ID o PIN y separa tus cuentas con perfiles.',
    where: 'Pestaña Perfil',
    firstStep: 'Activa Face ID o un PIN',
  },
};

/** Servicios que cada interés pone en primer lugar. */
const FEATURES_BY_INTEREST: Record<InterestId, FeatureId[]> = {
  gastos:        ['presupuestos', 'informes'],
  ahorro:        ['metas'],
  deudas:        ['deudas'],
  suscripciones: ['suscripciones'],
  inversion:     ['inversiones'],
  ia:            ['asistente'],
};

/** Si no elige nada, se le muestra lo esencial. */
const DEFAULT_FEATURES: FeatureId[] = ['presupuestos', 'metas', 'asistente'];

/** Máximo de diapositivas de servicios, para que la bienvenida siga siendo corta. */
export const MAX_TOUR_FEATURES = 5;

/**
 * Servicios que se muestran, en orden:
 * 1. Registrar movimientos (es la base de todo lo demás).
 * 2. Lo que pidió, en el orden de la lista de intereses.
 * 3. El asistente con IA, porque es lo que distingue a la app.
 * 4. Seguridad, si aún hay espacio.
 * Sin repetir y con un tope de `MAX_TOUR_FEATURES`.
 */
export function buildTour(interests: readonly InterestId[]): Feature[] {
  const chosen = INTERESTS.filter((i) => interests.includes(i.id)).map((i) => i.id);
  const fromInterests = chosen.length > 0 ? chosen.flatMap((id) => FEATURES_BY_INTEREST[id]) : DEFAULT_FEATURES;
  const ordered: FeatureId[] = ['movimientos', ...fromInterests, 'asistente', 'seguridad'];
  const unique = ordered.filter((id, i) => ordered.indexOf(id) === i);
  return unique.slice(0, MAX_TOUR_FEATURES).map((id) => FEATURES[id]);
}

/** Primer nombre, para saludar sin ocupar toda la pantalla. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

/** Nombre limpio para guardar: sin espacios de más y con un tope razonable. */
export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, 40);
}
