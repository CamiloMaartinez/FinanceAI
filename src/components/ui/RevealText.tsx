import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type NativeSyntheticEvent, type StyleProp, type TextLayoutEventData, type TextStyle } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '../../constants/theme';
import { REVEAL, timingReveal } from '../../constants/motion';
import { Text } from './Text';

type Line = TextLayoutEventData['lines'][number];

interface RevealTextProps {
  children: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  accessibilityRole?: 'header' | 'text';
  /** Espera antes de la primera línea (ms). */
  delay?: number;
  testID?: string;
}

/**
 * Revelado por líneas con bloque de color (J2), del data-anim-high de
 * Pixtta: en cada línea un bloque lavanda crece de izquierda a derecha,
 * la tapa, el texto aparece debajo y el bloque se retira hacia la derecha.
 * 0,5 s por línea y 0,12 s entre líneas.
 *
 * El texto real queda en su sitio (invisible) y da el tamaño; las líneas
 * se dibujan encima con lo medido en onTextLayout. Al terminar vuelve el
 * texto real. Se lee una sola vez y completo. Con "reducir movimiento"
 * aparece sin revelado.
 */
export function RevealText({ children, style, numberOfLines, accessibilityRole = 'text', delay = 0, testID }: RevealTextProps) {
  const reduceMotion = useReducedMotion();
  const [lines, setLines] = useState<Line[] | null>(null);
  const [done, setDone] = useState(reduceMotion);
  const finished = useRef(0);

  // Texto nuevo: se vuelve a medir y a revelar
  useEffect(() => {
    finished.current = 0;
    setLines(null);
    setDone(reduceMotion);
  }, [children, reduceMotion]);

  // Seguro: si nunca llega la medición (o se corta una animación), el texto
  // no se puede quedar invisible
  useEffect(() => {
    if (done) return;
    const id = setTimeout(() => setDone(true), delay + REVEAL.failsafeMs);
    return () => clearTimeout(id);
  }, [done, delay, children]);

  const onTextLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    if (done || lines) return;
    const measured = e.nativeEvent.lines.filter((l) => l.text.trim().length > 0);
    if (measured.length === 0) setDone(true);
    else setLines(measured);
  };

  const onLineDone = () => {
    finished.current += 1;
    if (lines && finished.current >= lines.length) setDone(true);
  };

  return (
    <View testID={testID}>
      <Text
        style={[style, !done && styles.hidden]}
        numberOfLines={numberOfLines}
        onTextLayout={onTextLayout}
        accessibilityRole={accessibilityRole}
      >
        {children}
      </Text>
      {!done &&
        lines?.map((line, i) => (
          <RevealLine
            key={`${i}-${line.text}`}
            line={line}
            style={style}
            delay={delay + i * REVEAL.lineGapMs}
            onDone={onLineDone}
          />
        ))}
    </View>
  );
}

function RevealLine({
  line,
  style,
  delay,
  onDone,
}: {
  line: Line;
  style?: StyleProp<TextStyle>;
  delay: number;
  onDone: () => void;
}) {
  const c = useColors();
  // 0→1: el bloque crece desde la izquierda; 1→2: se retira hacia la derecha
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(
      delay,
      withTiming(2, timingReveal, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const width = line.width;
  const blockStyle = useAnimatedStyle(() => {
    const grow = Math.min(p.value, 1);
    const shrink = Math.max(p.value - 1, 0);
    const scale = p.value <= 1 ? grow : 1 - shrink;
    // El origen es la izquierda: para encogerse hacia la derecha se corre
    return { transform: [{ translateX: width * (p.value <= 1 ? 0 : shrink) }, { scaleX: scale }] };
  });
  const textStyle = useAnimatedStyle(() => {
    const shown = p.value >= 1 ? 1 : 0;
    return { opacity: shown, transform: [{ translateY: (1 - Math.min(Math.max(p.value - 0.8, 0) / 0.6, 1)) * 6 }] };
  });

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.line, { left: line.x, top: line.y, width: line.width + 2, height: line.height }]}
    >
      <Animated.View style={textStyle}>
        <Text style={style} numberOfLines={1}>
          {line.text.replace(/\s+$/, '')}
        </Text>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.block, { backgroundColor: c.lavender }, blockStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
  line: { position: 'absolute', overflow: 'hidden' },
  block: { transformOrigin: 'left' },
});
