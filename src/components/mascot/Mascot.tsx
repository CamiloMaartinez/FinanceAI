import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { darkColors, useColors } from '../../constants/theme';
import {
  MASCOT,
  springCelebrate,
  timingBlinkClose,
  timingBlinkOpen,
  timingHop,
} from '../../constants/motion';
import { haptics } from '../../utils/haptics';
import {
  MASCOT_COLORS as M,
  POSES,
  type Eyes,
  type Limb,
  type MascotPose,
  type Mouth,
  type PoseSpec,
} from './poses';

export type { MascotPose } from './poses';

interface MascotProps {
  pose?: MascotPose;
  /** Ancho y alto en puntos. */
  size?: number;
  /** Al tocarlo salta, se pone feliz y vibra. */
  interactive?: boolean;
  onPress?: () => void;
  /**
   * Color de brazos y piernas: `light` sobre fondos oscuros (login, onboarding),
   * `dark` sobre claros. `auto` sigue el tema.
   */
  tone?: 'auto' | 'light' | 'dark';
  /** Acompaña a un texto que ya dice lo mismo: se oculta al lector de pantalla. */
  decorative?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const TAU = Math.PI * 2;
const STROKE = 4.5;

/**
 * Moni, la moneda de Smart Finance. Está dibujada por capas (cuerpo, cara,
 * cada brazo y cada pierna) y cada capa se mueve con transform desde su
 * hombro o cadera: respira, parpadea, hace el gesto de su pose y salta si
 * la tocas. Con "reducir movimiento" se queda quieta en su pose.
 */
export function Mascot({
  pose = 'saludando',
  size = 160,
  interactive = false,
  onPress,
  tone = 'auto',
  decorative = false,
  style,
  testID,
}: MascotProps) {
  const c = useColors();
  const reduceMotion = useReducedMotion();
  const spec = POSES[pose];
  const k = size / 200;
  const limbColor =
    tone === 'light' || (tone === 'auto' && c.background === darkColors.background) ? M.inkLight : M.ink;

  const [tapped, setTapped] = useState(false);
  const eyes: Eyes = tapped ? 'happy' : spec.eyes;
  const mouth: Mouth = tapped ? 'open' : spec.mouth;

  // Un solo reloj (0→1 por ciclo) mueve todo el gesto: brazos, piernas,
  // saltos y accesorios van coordinados
  const clock = useSharedValue(0);
  const breath = useSharedValue(0);
  const blink = useSharedValue(1);
  const squash = useSharedValue(1);
  const hop = useSharedValue(0);

  const firstPose = useRef(true);
  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(clock);
      cancelAnimation(breath);
      clock.value = 0;
      breath.value = 0;
      return;
    }
    clock.value = 0;
    clock.value = withRepeat(
      withTiming(1, { duration: spec.cycleMs, easing: Easing.linear, reduceMotion: ReduceMotion.System }),
      -1,
      false,
    );
    breath.value = withRepeat(
      withTiming(1, {
        duration: spec.motion === 'sleep' ? MASCOT.sleepBreathMs : MASCOT.breathMs,
        easing: Easing.inOut(Easing.sin),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
    );
    // Al cambiar de pose se aplasta y recupera, como si tomara impulso
    if (!firstPose.current) {
      squash.value = withSequence(
        withTiming(0.9, { duration: 90, reduceMotion: ReduceMotion.System }),
        withSpring(1, springCelebrate),
      );
    }
    firstPose.current = false;
    return () => {
      cancelAnimation(clock);
      cancelAnimation(breath);
    };
  }, [pose, reduceMotion, spec.cycleMs, spec.motion, clock, breath, squash]);

  // Parpadeo a intervalos al azar, solo con los ojos abiertos
  const canBlink = eyes === 'dot' || eyes === 'determined';
  useEffect(() => {
    if (reduceMotion || !canBlink) return;
    let id: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const wait = MASCOT.blinkMinMs + Math.random() * (MASCOT.blinkMaxMs - MASCOT.blinkMinMs);
      id = setTimeout(() => {
        blink.value = withSequence(withTiming(0.1, timingBlinkClose), withTiming(1, timingBlinkOpen));
        schedule();
      }, wait);
    };
    schedule();
    return () => clearTimeout(id);
  }, [reduceMotion, canBlink, blink]);

  const tapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(tapTimer.current), []);
  const handlePress = () => {
    haptics.light();
    setTapped(true);
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setTapped(false), MASCOT.tapFaceMs);
    if (!reduceMotion) {
      // Interrumpible: si ya iba en el aire, sigue desde donde estaba
      hop.value = withSequence(withTiming(-16, timingHop), withSpring(0, springCelebrate));
    }
    onPress?.();
  };

  const motion = spec.motion;
  const swingOrigin = motion === 'swing';

  const rootStyle = useAnimatedStyle(() => {
    const t = clock.value;
    const jump = motion === 'jump' ? -14 * Math.abs(Math.sin(Math.PI * t)) : 0;
    const swing = motion === 'swing' ? 5 * Math.sin(TAU * t) : 0;
    return {
      transform: [
        { translateX: spec.offsetX * k },
        { translateY: (jump + hop.value) * k },
        { rotate: `${swing}deg` },
        { scaleX: 2 - squash.value },
        { scaleY: squash.value },
      ],
    };
  });

  const torsoStyle = useAnimatedStyle(() => {
    const t = clock.value;
    const run = motion === 'run' ? -3 * Math.abs(Math.sin(TAU * t)) : 0;
    return {
      transform: [
        { translateY: (run - 2 * breath.value) * k },
        { rotate: `${spec.tilt}deg` },
        { scale: 1 + 0.03 * breath.value },
      ],
    };
  });

  const eyesStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));

  const armAngle = (side: 'left' | 'right') => {
    'worklet';
    const s = Math.sin(TAU * clock.value);
    const lift = 0.5 - 0.5 * Math.cos(TAU * clock.value);
    const sign = side === 'left' ? 1 : -1;
    switch (motion) {
      case 'wave': return 14 * s * sign;
      case 'nod': return side === 'right' ? -8 * lift : 0;
      case 'scan': return side === 'right' ? 6 * s : 0;
      case 'shield': return side === 'right' ? 5 * s : 3 * s;
      case 'point': return side === 'right' ? -6 * lift : 0;
      case 'run': return -16 * s * sign;
      case 'jump': return 8 * Math.sin(2 * TAU * clock.value) * sign;
      default: return 0;
    }
  };
  const legAngle = (side: 'left' | 'right') => {
    'worklet';
    const s = Math.sin(TAU * clock.value);
    const sign = side === 'left' ? 1 : -1;
    if (motion === 'run') return 20 * s * sign;
    if (motion === 'jump') return 6 * s * sign;
    return 0;
  };

  const leftArmStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${armAngle('left')}deg` }] }));
  const rightArmStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${armAngle('right')}deg` }] }));
  const leftLegStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${legAngle('left')}deg` }] }));
  const rightLegStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${legAngle('right')}deg` }] }));

  const shadowStyle = useAnimatedStyle(() => {
    const air = motion === 'jump' ? Math.abs(Math.sin(Math.PI * clock.value)) : 0;
    return { opacity: 1 - air * 0.4, transform: [{ scaleX: 1 - air * 0.25 + hop.value * 0.01 }] };
  });
  const zzzStyle = useAnimatedStyle(() => ({
    opacity: 1 - clock.value,
    transform: [{ translateY: -12 * clock.value * k }, { translateX: 4 * clock.value * k }],
  }));
  const speedStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + 0.55 * Math.abs(Math.sin(2 * TAU * clock.value)),
  }));

  const has = (a: PoseSpec['accessories'][number]) => spec.accessories.includes(a);

  const figure = (
    <View style={{ width: size, height: size }}>
      {spec.shadow && (
        <Layer size={size} style={shadowStyle} pivot={{ x: 100, y: 182 }}>
          <Ellipse cx={100 + spec.offsetX} cy={182} rx={34} ry={6} fill={M.lens} opacity={0.5} />
        </Layer>
      )}
      {has('bar') && (
        <Layer size={size}>
          <Line x1={20} y1={25} x2={180} y2={25} stroke={M.sparkleLavender} strokeWidth={4} strokeLinecap="round" />
        </Layer>
      )}
      {has('chart') && (
        <Layer size={size}>
          <Chart ink={limbColor} />
        </Layer>
      )}
      {has('speed') && (
        <Layer size={size} style={speedStyle}>
          <Path d="M6 72 L36 68 M2 94 L30 92 M10 116 L36 114" stroke={M.sparkleLavender} strokeWidth={3.5} strokeLinecap="round" />
        </Layer>
      )}

      <Animated.View
        style={[StyleSheet.absoluteFill, { transformOrigin: swingOrigin ? '50% 12.5%' : '50% 84%' }, rootStyle]}
      >
        <Layer size={size} pivot={spec.legs.left.pivot} style={leftLegStyle}>
          <LimbShape limb={spec.legs.left} color={limbColor} />
        </Layer>
        <Layer size={size} pivot={spec.legs.right.pivot} style={rightLegStyle}>
          <LimbShape limb={spec.legs.right} color={limbColor} />
        </Layer>

        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: '50% 64%' }, torsoStyle]}>
          <Layer size={size}>
            <Coin />
          </Layer>
          <Layer size={size} pivot={{ x: 100, y: 88 }} style={eyesStyle}>
            <EyesShape eyes={eyes} />
          </Layer>
          <Layer size={size}>
            <MouthShape mouth={mouth} />
          </Layer>
          <Layer size={size} pivot={spec.arms.left.pivot} style={leftArmStyle}>
            <LimbShape limb={spec.arms.left} color={limbColor} />
            {has('shield') && <Shield />}
          </Layer>
          <Layer size={size} pivot={spec.arms.right.pivot} style={rightArmStyle}>
            {has('magnifier') && <Magnifier />}
            <LimbShape limb={spec.arms.right} color={limbColor} />
          </Layer>
        </Animated.View>

        {has('zzz') && (
          <Layer size={size} style={zzzStyle}>
            <Path
              d="M134 50 L142 50 L134 58 L142 58 M148 36 L158 36 L148 46 L158 46 M164 20 L176 20 L164 32 L176 32"
              stroke={M.sparkleLavender}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Layer>
        )}
      </Animated.View>

      {has('confetti') &&
        CONFETTI.map((piece, i) => <ConfettiPiece key={i} piece={piece} clock={clock} size={size} />)}
    </View>
  );

  const a11y = decorative
    ? { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const }
    : { accessible: true, accessibilityLabel: `Moni ${spec.label}` };

  if (!interactive) {
    return (
      <View testID={testID} style={style} accessibilityRole={decorative ? undefined : 'image'} {...a11y}>
        {figure}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      style={style}
      onPress={handlePress}
      accessibilityRole={decorative ? undefined : 'button'}
      accessibilityHint={decorative ? undefined : 'Toca a Moni para saludarla'}
      {...a11y}
    >
      {figure}
    </Pressable>
  );
}

// ─── Piezas ──────────────────────────────────────────────────

function Layer({
  size,
  pivot,
  style,
  children,
}: {
  size: number;
  pivot?: { x: number; y: number };
  style?: React.ComponentProps<typeof Animated.View>['style'];
  children: React.ReactNode;
}) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, pivot && { transformOrigin: `${pivot.x / 2}% ${pivot.y / 2}%` }, style]}
    >
      <Svg width={size} height={size} viewBox="0 0 200 200">
        {children}
      </Svg>
    </Animated.View>
  );
}

function Coin() {
  return (
    <G>
      {/* Canto: la moneda tiene grosor hacia la derecha */}
      <Ellipse cx={106} cy={90} rx={46} ry={48.5} fill={M.coinEdge} />
      <Circle cx={100} cy={90} r={48} fill={M.coinFace} />
      <Circle cx={100} cy={90} r={37} stroke={M.coinRing} strokeWidth={3} fill="none" />
      <Path d="M64 74 Q71 57 89 50" stroke={M.coinShine} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.8} />
      <Ellipse cx={79} cy={101} rx={7} ry={4} fill={M.cheek} opacity={0.6} />
      <Ellipse cx={121} cy={101} rx={7} ry={4} fill={M.cheek} opacity={0.6} />
    </G>
  );
}

function EyesShape({ eyes }: { eyes: Eyes }) {
  const line = { stroke: M.ink, strokeWidth: 3.2, strokeLinecap: 'round' as const, fill: 'none' };
  switch (eyes) {
    case 'happy':
      return (
        <G>
          <Path d="M80 91 Q86 82 92 91" {...line} />
          <Path d="M108 91 Q114 82 120 91" {...line} />
        </G>
      );
    case 'closed':
      return (
        <G>
          <Path d="M80 87 Q86 94 92 87" {...line} />
          <Path d="M108 87 Q114 94 120 87" {...line} />
        </G>
      );
    case 'wink':
      return (
        <G>
          <Path d="M80 84 L91 88 L80 92" {...line} strokeLinejoin="round" />
          <Ellipse cx={118} cy={87} rx={5.2} ry={6.6} fill={M.ink} />
          <Circle cx={120} cy={84.5} r={1.6} fill="#FFFFFF" />
        </G>
      );
    case 'determined':
      return (
        <G>
          <Path d="M79 78 L92 83" {...line} />
          <Path d="M121 78 L108 83" {...line} />
          <Ellipse cx={86} cy={89} rx={3.6} ry={4.6} fill={M.ink} />
          <Ellipse cx={114} cy={89} rx={3.6} ry={4.6} fill={M.ink} />
        </G>
      );
    default:
      return (
        <G>
          <Ellipse cx={86} cy={88} rx={3.6} ry={4.8} fill={M.ink} />
          <Ellipse cx={114} cy={88} rx={3.6} ry={4.8} fill={M.ink} />
          <Circle cx={87.2} cy={86.2} r={1.1} fill="#FFFFFF" />
          <Circle cx={115.2} cy={86.2} r={1.1} fill="#FFFFFF" />
        </G>
      );
  }
}

function MouthShape({ mouth }: { mouth: Mouth }) {
  switch (mouth) {
    case 'open':
      return (
        <G>
          <Path d="M88 102 Q100 121 112 102 Z" fill={M.ink} strokeLinejoin="round" />
          <Ellipse cx={100} cy={111} rx={5.5} ry={3} fill={M.cheek} />
        </G>
      );
    case 'o':
      return <Ellipse cx={100} cy={106} rx={3.8} ry={4.8} fill={M.ink} />;
    case 'small':
      return <Path d="M95 106 Q100 109.5 105 106" stroke={M.ink} strokeWidth={2.8} strokeLinecap="round" fill="none" />;
    default:
      return <Path d="M89 103 Q100 113 111 103" stroke={M.ink} strokeWidth={3.2} strokeLinecap="round" fill="none" />;
  }
}

function LimbShape({ limb, color }: { limb: Limb; color: string }) {
  const { end, tip } = limb;
  const stroke = { stroke: color, strokeLinecap: 'round' as const, fill: 'none' };
  return (
    <G>
      <Path d={limb.d} strokeWidth={STROKE} {...stroke} />
      {end.kind === 'foot' ? (
        <Ellipse cx={end.x} cy={end.y} rx={8} ry={4.2} strokeWidth={3.4} {...stroke} />
      ) : (
        <Circle cx={end.x} cy={end.y} r={end.kind === 'point' ? 4.5 : 5.5} fill={color} />
      )}
      {end.kind === 'thumb' && (
        <Path d={`M${end.x} ${end.y - 3} L${end.x - 1} ${end.y - 12}`} strokeWidth={4} {...stroke} />
      )}
      {end.kind === 'open' && (
        <Path
          d={`M${end.x} ${end.y} L${end.x - 6} ${end.y - 6} M${end.x} ${end.y} L${end.x} ${end.y - 9} M${end.x} ${end.y} L${end.x + 6} ${end.y - 6}`}
          strokeWidth={3}
          {...stroke}
        />
      )}
      {end.kind === 'point' && tip && (
        <Path d={`M${end.x} ${end.y} L${tip.x} ${tip.y}`} strokeWidth={3.4} {...stroke} />
      )}
    </G>
  );
}

function Magnifier() {
  return (
    <G>
      <Path d="M135 99 L148 114" stroke={M.ink} strokeWidth={5.5} strokeLinecap="round" />
      <Circle cx={124} cy={88} r={14} fill={M.lens} fillOpacity={0.5} stroke={M.ink} strokeWidth={3.5} />
      <Path d="M116 82 Q119 77 125 76" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" fill="none" />
    </G>
  );
}

function Shield() {
  return (
    <G>
      <Path
        d="M28 106 L54 106 L54 123 Q54 138 41 145 Q28 138 28 123 Z"
        fill={M.shield}
        stroke={M.ink}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <Path
        d="M41 114 L43.4 119.4 L49 119.8 L44.7 123.4 L46 129 L41 126 L36 129 L37.3 123.4 L33 119.8 L38.6 119.4 Z"
        fill={M.ink}
      />
    </G>
  );
}

function Chart({ ink }: { ink: string }) {
  const grid = [46, 62, 78, 94].map((y) => `M132 ${y} L192 ${y}`).join(' ') +
    ' ' + [148, 164, 180].map((x) => `M${x} 34 L${x} 104`).join(' ');
  return (
    <G>
      <Path d={grid} stroke={M.sparkleLavender} strokeWidth={1.5} opacity={0.6} />
      <Path d="M132 32 L132 104 L194 104" stroke={ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M136 96 Q148 66 160 82 Q170 94 184 50" stroke={ink} strokeWidth={3} strokeLinecap="round" fill="none" />
      <Path d="M176 52 L185 47 L186 57" stroke={ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M190 30 L192 36 L198 38 L192 40 L190 46 L188 40 L182 38 L188 36 Z" fill={M.sparklePeach} />
    </G>
  );
}

// Confeti: cada pieza cae en bucle con su propio desfase
const CONFETTI = [
  { x: 24, offset: 0, color: M.sparkleLavender, rot: 20 },
  { x: 46, offset: 0.55, color: M.sparklePeach, rot: -30 },
  { x: 68, offset: 0.25, color: M.coinFace, rot: 45 },
  { x: 132, offset: 0.7, color: M.sparklePeach, rot: 10 },
  { x: 154, offset: 0.15, color: M.sparkleLavender, rot: -45 },
  { x: 176, offset: 0.4, color: M.coinEdge, rot: 30 },
  { x: 92, offset: 0.85, color: M.sparkleLavender, rot: -15 },
  { x: 112, offset: 0.35, color: M.coinEdge, rot: 60 },
];

function ConfettiPiece({
  piece,
  clock,
  size,
}: {
  piece: (typeof CONFETTI)[number];
  clock: SharedValue<number>;
  size: number;
}) {
  const k = size / 200;
  const style = useAnimatedStyle(() => {
    const t = (clock.value * 0.5 + piece.offset) % 1;
    return {
      opacity: t < 0.85 ? 1 : (1 - t) / 0.15,
      transform: [
        { translateY: (t * 150 - 10) * k },
        { translateX: Math.sin(t * TAU) * 6 * k },
        { rotate: `${piece.rot + t * 360}deg` },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: piece.x * k, top: 0, width: 6 * k, height: 10 * k }, style]}
    >
      <Svg width={6 * k} height={10 * k} viewBox="0 0 6 10">
        <Rect x={0} y={0} width={6} height={10} rx={1.5} fill={piece.color} />
      </Svg>
    </Animated.View>
  );
}
