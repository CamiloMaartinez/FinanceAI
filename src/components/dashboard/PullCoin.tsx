import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Rect, Text as SvgText } from 'react-native-svg';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';
import { useColors, fonts, pastels } from '../../constants/theme';

const SIZE = 36;
const R = SIZE / 2 - 2;
const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface PullCoinProps {
  /** Alto del hueco abierto arriba del contenido. */
  gap: SharedValue<number>;
  /** 0 → 1 a medida que se jala hasta el umbral. */
  progress: SharedValue<number>;
  /** Grados extra de giro mientras carga. */
  spin: SharedValue<number>;
  /** Escala del rebote final. */
  pop: SharedValue<number>;
  /** Dónde empieza el hueco (debajo de la barra de estado). */
  top: number;
}

/**
 * Moneda del pull-to-refresh: se llena de abajo hacia arriba según lo que
 * se jala, gira de canto mientras carga y rebota al terminar. Vive en el
 * hueco que abre el contenido, así que aparece y se va con él.
 */
export function PullCoin({ gap, progress, spin, pop, top }: PullCoinProps) {
  const c = useColors();
  const reduceMotion = useReducedMotion();

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(gap.value, [8, 32], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: Math.max((gap.value - SIZE) / 2, 0) },
      { perspective: 400 },
      // Con "reducir movimiento" no gira: solo se llena y se desvanece
      { rotateY: `${reduceMotion ? 0 : progress.value * 180 + spin.value}deg` },
      { scale: pop.value },
    ],
  }));

  const fillProps = useAnimatedProps(() => ({
    y: SIZE * (1 - progress.value),
    height: SIZE * progress.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.coin, { top }, style]}
    >
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Defs>
          <ClipPath id="pull-coin">
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} />
          </ClipPath>
        </Defs>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill={c.sheet} fillOpacity={0.35} />
        <AnimatedRect x={0} width={SIZE} fill={pastels.yellow} clipPath="url(#pull-coin)" animatedProps={fillProps} />
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={c.heroText} strokeWidth={2} />
        <SvgText
          x={SIZE / 2}
          y={SIZE / 2 + 6}
          textAnchor="middle"
          fontSize={17}
          fontFamily={fonts.bold}
          fill={c.heroText}
        >
          $
        </SvgText>
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  coin: { position: 'absolute', alignSelf: 'center', width: SIZE, height: SIZE, zIndex: 3 },
});
