import { Easing, FadeInDown, ReduceMotion, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

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

// ─── Inspiradas en Pixtta ────────────────────────────────────

// Curva de marca: arranca rápido y se asienta largo (entradas, revelados).
export const easeOutBrand = Easing.bezier(0.23, 1, 0.32, 1);
// Curva de cortina: lenta en los extremos y rápida al medio (paneles que tapan la pantalla).
export const easeInOutCurtain = Easing.bezier(0.77, 0, 0.175, 1);

/** Cortina de marca (J1): los paneles suben y tapan la pantalla. */
export const timingCurtainIn: WithTimingConfig = {
  duration: 450,
  easing: easeInOutCurtain,
  reduceMotion: ReduceMotion.System,
};

/** Cortina de marca (J1) y splash: los paneles siguen subiendo para mostrar lo de abajo. */
export const timingCurtainOut: WithTimingConfig = {
  duration: 500,
  easing: easeInOutCurtain,
  reduceMotion: ReduceMotion.System,
};

/** Revelado de títulos (J2): cada línea. */
export const timingReveal: WithTimingConfig = {
  duration: 500,
  easing: easeOutBrand,
  reduceMotion: ReduceMotion.System,
};

/** Salidas (J3): más cortas que la entrada y acelerando, para que no estorben. */
export const timingExit: WithTimingConfig = {
  duration: 200,
  easing: Easing.in(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};

/** Splash (I2): cuánto avanza la barra por cada paso real del arranque. */
export const timingSplash: WithTimingConfig = {
  duration: 220,
  easing: easeOutBrand,
  reduceMotion: ReduceMotion.System,
};

/**
 * El "fundido corto" que reemplaza a cortinas y splash cuando el sistema
 * pide reducir movimiento. Solo anima opacidad, por eso no se apaga con
 * ReduceMotion.System (con System sería un corte seco).
 */
export const timingFadeReduced: WithTimingConfig = {
  duration: 150,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.Never,
};

/** Separación entre elementos de una cascada (A6, B6). */
export const STAGGER_MS = 40;
/** Solo los primeros escalonan; los demás entran junto con el último. */
export const STAGGER_MAX = 8;

/** Retraso de un elemento de la cascada: nunca espera más que el 8.º. */
export function staggerDelay(index: number): number {
  return Math.min(Math.max(index, 0), STAGGER_MAX - 1) * STAGGER_MS;
}

/**
 * Entrada en cascada para el `entering` de una lista: cada elemento sube un
 * poco y aparece, 40 ms después del anterior. `pop` usa el resorte con
 * rebote (botones de Inicio); `fade` una curva sin rebote (filas).
 * Con "reducir movimiento" el sistema la apaga.
 */
export function staggerEntering(index: number, variant: 'fade' | 'pop' = 'fade') {
  const base = FadeInDown.delay(staggerDelay(index)).reduceMotion(ReduceMotion.System);
  if (variant === 'pop') {
    return base.springify(springCelebrate.duration).dampingRatio(springCelebrate.dampingRatio ?? 0.55);
  }
  return base
    .duration(320)
    .easing(easeOutBrand)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] });
}

/** Splash (I2): duración de cada parte de la salida y tope total. */
export const SPLASH = {
  /** El contenido se desvanece antes de que suba el panel. */
  fadeMs: 200,
  /** El panel empieza a subir con el fundido a medio camino. */
  curtainDelayMs: 100,
  maxTotalMs: 1600,
} as const;

// ─── Personaje (Moni) ────────────────────────────────────────

/** Ritmos del personaje: todo lo que se repite mientras está en pantalla. */
export const MASCOT = {
  /** Media respiración (inhala o exhala). */
  breathMs: 1500,
  /** Durmiendo respira más lento. */
  sleepBreathMs: 2600,
  /** Entre parpadeos, al azar dentro de este rango. */
  blinkMinMs: 2500,
  blinkMaxMs: 5000,
  /** Cuánto se queda feliz después de tocarlo. */
  tapFaceMs: 900,
} as const;

/** Parpadeo: cierra rápido y abre un poco más lento. */
export const timingBlinkClose: WithTimingConfig = {
  duration: 70,
  easing: Easing.in(Easing.quad),
  reduceMotion: ReduceMotion.System,
};
export const timingBlinkOpen: WithTimingConfig = {
  duration: 130,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
};

/** Salto al tocarlo: sube rápido y cae con un rebote. */
export const timingHop: WithTimingConfig = {
  duration: 160,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
};

// ─── Cortina de marca (J1) y desbloqueo (I3) ─────────────────

export const CURTAIN = {
  /** El panel morado sale un instante después del magenta. */
  panelGapMs: 60,
  /** Si la pantalla nueva no llega, la cortina se abre igual. */
  failsafeMs: 5000,
  /** El logo aparece cuando el panel morado ya va por la mitad. */
  markDelayMs: 250,
} as const;

/** Logo de la cortina: aparece y desaparece rápido. */
export const timingMark: WithTimingConfig = {
  duration: 180,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
};

/** Desbloqueo: cuánto se ve el candado abierto antes de la cortina. */
export const UNLOCK_HOLD_MS = 380;

/** Temblor de error (PIN incorrecto): cada ida o vuelta. */
export const timingShake: WithTimingConfig = {
  duration: 55,
  easing: Easing.inOut(Easing.quad),
  reduceMotion: ReduceMotion.System,
};

// ─── Odómetro (B2) y monto al escribir (G1) ──────────────────

/** Cada dígito que rueda: el viejo sale y el nuevo entra. */
export const timingRoll: WithTimingConfig = {
  duration: 300,
  easing: easeOutBrand,
  reduceMotion: ReduceMotion.System,
};

/** El monto se encoge o crece para caber en el ancho disponible. */
export const timingFit: WithTimingConfig = {
  duration: 220,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};

/** Revelado de títulos (J2): separación entre líneas. */
export const REVEAL = {
  lineGapMs: 120,
  /** Si no se pudo medir o animar, el texto aparece igual. */
  failsafeMs: 2500,
} as const;

// ─── Punto "en vivo" (B5) ────────────────────────────────────

/** Pulso del mapa de Pixtta: el anillo crece y se desvanece en bucle. */
export const PULSE = { durationMs: 1800, scaleTo: 2.4, opacityFrom: 0.6 } as const;

// ─── Escaneo de recibo (D6) ──────────────────────────────────

/** La foto del recibo entra con un zoom lento (1,14 → 1), como el hero de Pixtta. */
export const timingZoomIn: WithTimingConfig = {
  duration: 900,
  easing: easeOutBrand,
  reduceMotion: ReduceMotion.System,
};

/** Visor del recibo a pantalla completa: fundido y escala 0,96 → 1. */
export const timingViewerIn: WithTimingConfig = {
  duration: 450,
  easing: easeOutBrand,
  reduceMotion: ReduceMotion.System,
};

/** La línea láser recorre la foto de arriba abajo y vuelve. */
export const timingLaser: WithTimingConfig = {
  duration: 1400,
  easing: Easing.inOut(Easing.sin),
  reduceMotion: ReduceMotion.System,
};
