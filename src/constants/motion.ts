import { Easing, ReduceMotion, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

// Presets de resorte (apple-design §4): pensados en "damping ratio" +
// "response" (segundos), no en duración fija — el tiempo de asentamiento
// emerge de los parámetros. Reanimated expone esto directo vía
// `duration` + `dampingRatio` en withSpring.

// Uso por defecto: crítica, sin rebote — para casi todo lo que no
// arrastra momentum de un gesto.
export const springDefault: WithSpringConfig = {
  duration: 400,
  dampingRatio: 1,
  reduceMotion: ReduceMotion.System,
};

// Solo cuando el gesto en sí trae momentum (flick, drag release).
export const springMomentum: WithSpringConfig = {
  duration: 400,
  dampingRatio: 0.8,
  reduceMotion: ReduceMotion.System,
};

// Hoja / drawer (bottom sheet, modales).
export const springSheet: WithSpringConfig = {
  duration: 300,
  dampingRatio: 0.8,
  reduceMotion: ReduceMotion.System,
};

// Feedback de presión (botones, tarjetas) — rápido y sin rebote.
export const springPress: WithSpringConfig = {
  duration: 220,
  dampingRatio: 1,
  reduceMotion: ReduceMotion.System,
};

/**
 * Proyecta el punto de reposo de un gesto según su velocidad de salida,
 * igual que el scroll deceleration de iOS (apple-design §6). No usar la
 * fórmula v²/(2·decel) del libro de física — esta es la que Apple usa.
 */
export function projectMomentum(velocity: number, decelerationRate = 0.998): number {
  'worklet';
  return (velocity / 1000) * decelerationRate / (1 - decelerationRate);
}

/**
 * Resistencia progresiva al pasar un límite (apple-design §9). Cuanto más
 * lejos del límite, menos sigue el elemento al dedo.
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  'worklet';
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

// Rebote visible para celebrar algo terminado (la moneda del
// pull-to-refresh al cargar). Solo para momentos puntuales.
export const springCelebrate: WithSpringConfig = {
  duration: 450,
  dampingRatio: 0.55,
  reduceMotion: ReduceMotion.System,
};

// Número que cuenta hasta su valor (saldo de Inicio): rápido al principio y
// se asienta al final, para que el valor exacto se lea pronto.
export const timingCountUp: WithTimingConfig = {
  duration: 900,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};

// Una vuelta completa a velocidad constante (para repetir mientras carga).
export const timingSpin: WithTimingConfig = {
  duration: 900,
  easing: Easing.linear,
  reduceMotion: ReduceMotion.System,
};

// Fundido corto: aparecer/desaparecer sin movimiento, y el equivalente
// sobrio cuando "reducir movimiento" está activo.
export const timingFadeQuick: WithTimingConfig = {
  duration: 150,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
};

/** Pull-to-refresh de Inicio: cuánto jalar para recargar y cuánto espacio queda mientras carga. */
export const PULL_REFRESH = {
  threshold: 80,
  hold: 64,
} as const;
