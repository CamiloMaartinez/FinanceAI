// Geometría de Moni, la moneda de Smart Finance, en un lienzo de 200×200.
// Cada brazo y pierna es un trazo que sale de su "pivote" (hombro o cadera):
// el componente lo rota desde ahí para animarlo sin redibujar el trazo.

export type MascotPose =
  | 'saludando'
  | 'aprobando'
  | 'investigando'
  | 'descansando'
  | 'protegiendo'
  | 'colgado'
  | 'senalando'
  | 'corriendo'
  | 'celebrando';

export type Eyes = 'dot' | 'happy' | 'closed' | 'wink' | 'determined';
export type Mouth = 'smile' | 'open' | 'o' | 'small';
export type HandKind = 'open' | 'fist' | 'thumb' | 'point' | 'foot';

export interface Point { x: number; y: number }

export interface Limb {
  /** Trazo SVG desde el pivote hasta la mano o el pie. */
  d: string;
  pivot: Point;
  end: Point & { kind: HandKind };
  /** Hacia dónde apunta el dedo (solo `point`). */
  tip?: Point;
}

/** Cómo se mueve la pose en bucle. */
export type Motion = 'wave' | 'nod' | 'scan' | 'sleep' | 'shield' | 'swing' | 'point' | 'run' | 'jump';

export type Accessory = 'magnifier' | 'shield' | 'zzz' | 'bar' | 'chart' | 'speed' | 'confetti';

export interface PoseSpec {
  /** Para el lector de pantalla: "Moni saludando". */
  label: string;
  eyes: Eyes;
  mouth: Mouth;
  arms: { left: Limb; right: Limb };
  legs: { left: Limb; right: Limb };
  /** Inclinación del cuerpo en grados (corre hacia adelante, duerme recostado). */
  tilt: number;
  /** Corrimiento horizontal del personaje (deja sitio a la gráfica). */
  offsetX: number;
  motion: Motion;
  /** Duración de un ciclo del movimiento. */
  cycleMs: number;
  accessories: Accessory[];
  /** Sombra en el piso (no tiene sentido colgado). */
  shadow: boolean;
}

// Cuerpo: moneda centrada en (100, 90) con radio 48
export const BODY = { cx: 100, cy: 90, r: 48 } as const;

const L_SHOULDER = { x: 56, y: 98 };
const R_SHOULDER = { x: 144, y: 98 };
const L_HIP = { x: 89, y: 128 };
const R_HIP = { x: 111, y: 128 };

const standingLegs = {
  left: { d: 'M89 128 L86 166', pivot: L_HIP, end: { x: 80, y: 168, kind: 'foot' as const } },
  right: { d: 'M111 128 L114 166', pivot: R_HIP, end: { x: 120, y: 168, kind: 'foot' as const } },
};

const handOnHip: Limb = { d: 'M56 98 Q38 110 52 124', pivot: L_SHOULDER, end: { x: 54, y: 124, kind: 'fist' } };

export const POSES: Record<MascotPose, PoseSpec> = {
  saludando: {
    label: 'saludando',
    eyes: 'happy',
    mouth: 'open',
    arms: {
      left: { d: 'M58 88 Q42 72 36 52', pivot: { x: 58, y: 88 }, end: { x: 35, y: 48, kind: 'open' } },
      right: { d: 'M142 88 Q158 72 164 52', pivot: { x: 142, y: 88 }, end: { x: 165, y: 48, kind: 'open' } },
    },
    legs: standingLegs,
    tilt: 0,
    offsetX: 0,
    motion: 'wave',
    cycleMs: 700,
    accessories: [],
    shadow: true,
  },
  aprobando: {
    label: 'aprobando',
    eyes: 'dot',
    mouth: 'smile',
    arms: {
      left: handOnHip,
      right: { d: 'M144 98 Q166 102 168 84', pivot: R_SHOULDER, end: { x: 168, y: 82, kind: 'thumb' } },
    },
    legs: standingLegs,
    tilt: 0,
    offsetX: 0,
    motion: 'nod',
    cycleMs: 1400,
    accessories: [],
    shadow: true,
  },
  investigando: {
    label: 'investigando',
    eyes: 'wink',
    mouth: 'o',
    arms: {
      left: { d: 'M56 100 Q40 112 38 126', pivot: { x: 56, y: 100 }, end: { x: 38, y: 128, kind: 'fist' } },
      right: { d: 'M144 102 Q160 116 150 116', pivot: { x: 144, y: 102 }, end: { x: 149, y: 116, kind: 'fist' } },
    },
    legs: {
      left: { d: 'M89 128 Q80 146 84 166', pivot: L_HIP, end: { x: 78, y: 168, kind: 'foot' } },
      right: { d: 'M111 128 Q122 146 116 166', pivot: R_HIP, end: { x: 122, y: 168, kind: 'foot' } },
    },
    tilt: 0,
    offsetX: 0,
    motion: 'scan',
    cycleMs: 1800,
    accessories: ['magnifier'],
    shadow: true,
  },
  descansando: {
    label: 'descansando',
    eyes: 'closed',
    mouth: 'small',
    arms: {
      left: { d: 'M56 104 Q44 118 54 128', pivot: { x: 56, y: 104 }, end: { x: 55, y: 129, kind: 'fist' } },
      right: { d: 'M144 104 Q158 116 148 128', pivot: { x: 144, y: 104 }, end: { x: 147, y: 129, kind: 'fist' } },
    },
    legs: {
      left: { d: 'M90 128 Q80 150 64 156', pivot: { x: 90, y: 128 }, end: { x: 60, y: 157, kind: 'foot' } },
      right: { d: 'M110 128 Q132 146 152 140', pivot: { x: 110, y: 128 }, end: { x: 156, y: 139, kind: 'foot' } },
    },
    tilt: -10,
    offsetX: 0,
    motion: 'sleep',
    cycleMs: 2600,
    accessories: ['zzz'],
    shadow: true,
  },
  protegiendo: {
    label: 'protegiendo',
    eyes: 'determined',
    mouth: 'smile',
    arms: {
      left: { d: 'M56 100 Q44 108 46 118', pivot: { x: 56, y: 100 }, end: { x: 46, y: 120, kind: 'fist' } },
      right: { d: 'M144 98 Q164 96 180 88', pivot: R_SHOULDER, end: { x: 181, y: 87, kind: 'point' }, tip: { x: 190, y: 83 } },
    },
    legs: {
      left: { d: 'M89 128 Q80 148 76 166', pivot: L_HIP, end: { x: 70, y: 168, kind: 'foot' } },
      right: { d: 'M111 128 Q122 148 126 166', pivot: R_HIP, end: { x: 132, y: 168, kind: 'foot' } },
    },
    tilt: 0,
    offsetX: 6,
    motion: 'shield',
    cycleMs: 1600,
    accessories: ['shield'],
    shadow: true,
  },
  colgado: {
    label: 'colgado de una barra',
    eyes: 'dot',
    mouth: 'o',
    arms: {
      left: { d: 'M68 60 Q60 42 64 28', pivot: { x: 68, y: 60 }, end: { x: 64, y: 25, kind: 'fist' } },
      right: { d: 'M132 60 Q140 42 136 28', pivot: { x: 132, y: 60 }, end: { x: 136, y: 25, kind: 'fist' } },
    },
    legs: {
      left: { d: 'M89 128 Q84 150 80 164', pivot: L_HIP, end: { x: 76, y: 167, kind: 'foot' } },
      right: { d: 'M111 128 Q118 148 122 160', pivot: R_HIP, end: { x: 126, y: 163, kind: 'foot' } },
    },
    tilt: 0,
    offsetX: 0,
    motion: 'swing',
    cycleMs: 2400,
    accessories: ['bar'],
    shadow: false,
  },
  senalando: {
    label: 'señalando una gráfica que sube',
    eyes: 'dot',
    mouth: 'o',
    arms: {
      left: handOnHip,
      right: { d: 'M144 96 Q160 90 168 76', pivot: { x: 144, y: 96 }, end: { x: 169, y: 74, kind: 'point' }, tip: { x: 175, y: 66 } },
    },
    legs: standingLegs,
    tilt: 0,
    offsetX: -24,
    motion: 'point',
    cycleMs: 1200,
    accessories: ['chart'],
    shadow: true,
  },
  corriendo: {
    label: 'corriendo',
    eyes: 'dot',
    mouth: 'o',
    arms: {
      left: { d: 'M56 98 Q40 104 34 116', pivot: L_SHOULDER, end: { x: 33, y: 118, kind: 'fist' } },
      right: { d: 'M144 98 Q160 90 168 80', pivot: R_SHOULDER, end: { x: 169, y: 78, kind: 'fist' } },
    },
    legs: {
      left: { d: 'M89 128 Q76 146 64 150', pivot: L_HIP, end: { x: 60, y: 151, kind: 'foot' } },
      right: { d: 'M111 128 Q128 140 132 160', pivot: R_HIP, end: { x: 137, y: 162, kind: 'foot' } },
    },
    tilt: 8,
    offsetX: 6,
    motion: 'run',
    cycleMs: 520,
    accessories: ['speed'],
    shadow: true,
  },
  celebrando: {
    label: 'celebrando',
    eyes: 'happy',
    mouth: 'open',
    arms: {
      left: { d: 'M58 90 Q42 68 32 54', pivot: { x: 58, y: 90 }, end: { x: 30, y: 50, kind: 'open' } },
      right: { d: 'M142 90 Q158 68 168 54', pivot: { x: 142, y: 90 }, end: { x: 170, y: 50, kind: 'open' } },
    },
    legs: {
      left: { d: 'M90 128 Q82 146 92 158', pivot: { x: 90, y: 128 }, end: { x: 94, y: 161, kind: 'foot' } },
      right: { d: 'M110 128 Q120 144 110 158', pivot: { x: 110, y: 128 }, end: { x: 114, y: 161, kind: 'foot' } },
    },
    tilt: 0,
    offsetX: 0,
    motion: 'jump',
    cycleMs: 900,
    accessories: ['confetti'],
    shadow: true,
  },
};

export const MASCOT_POSES = Object.keys(POSES) as MascotPose[];

/** Colores propios de Moni: la moneda es la misma en tema claro y oscuro. */
export const MASCOT_COLORS = {
  coinEdge: '#E8875A',
  coinFace: '#FBBF8F',
  coinRing: '#F3A06F',
  coinShine: '#FFE2C6',
  cheek: '#F28C7A',
  ink: '#2A1B6B',
  inkLight: '#F4F3FF',
  lens: '#D9DAFB',
  shield: '#F6A877',
  sparkleLavender: '#B9A6F0',
  sparklePeach: '#F8C98F',
} as const;
