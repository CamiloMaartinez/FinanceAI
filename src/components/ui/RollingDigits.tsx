import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  FadeOutDown,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { timingRoll } from '../../constants/motion';

const isDigit = (ch: string) => ch >= '0' && ch <= '9';

/**
 * Identidad de cada columna:
 * - `right` (odómetro): por posición desde la derecha, así las unidades,
 *   decenas… se comparan entre sí cuando el valor cambia.
 * - `left` (al escribir): cada dígito por su orden desde la izquierda, sin
 *   contar separadores; al teclear, los que ya estaban no cambian y solo
 *   entra el nuevo. Los separadores toman el nombre del dígito que los antecede.
 */
export function rollKeys(text: string, anchor: 'right' | 'left'): string[] {
  const chars = Array.from(text);
  if (anchor === 'right') return chars.map((_, i) => `r${chars.length - 1 - i}`);
  let digits = 0;
  return chars.map((ch) => (isDigit(ch) ? `d${digits++}` : `s${digits}${ch}`));
}

interface RollingDigitsProps {
  text: string;
  /** Estilo del texto: debe traer fontSize y lineHeight (el alto de cada columna). */
  style: StyleProp<TextStyle>;
  anchor?: 'right' | 'left';
  /** Al montar, los dígitos entran desde abajo. */
  animateOnMount?: boolean;
  /** Por defecto se lee el texto completo, una sola vez. */
  accessibilityLabel?: string;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Número tipo odómetro, con la mecánica del RollText de Pixtta: cada dígito
 * es una columna con overflow oculto; cuando cambia, la copia vieja sale y
 * la nueva entra con translateY. Los dígitos que no cambian no se mueven.
 * Sube si el dígito crece y baja si decrece, como un contador mecánico.
 */
export function RollingDigits({
  text,
  style,
  anchor = 'right',
  animateOnMount = false,
  accessibilityLabel,
  containerStyle,
  testID,
}: RollingDigitsProps) {
  const chars = Array.from(text);
  const keys = rollKeys(text, anchor);
  // Al escribir, las columnas se reacomodan suave cuando aparece un separador
  const layout = anchor === 'left' ? LinearTransition.duration(timingRoll.duration ?? 300).reduceMotion(ReduceMotion.System) : undefined;
  const exiting = anchor === 'left' ? FadeOutDown.duration(150).reduceMotion(ReduceMotion.System) : undefined;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? text}
      style={[styles.row, containerStyle]}
    >
      {chars.map((ch, i) => (
        <Animated.View key={keys[i]} layout={layout} exiting={exiting} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {isDigit(ch) ? (
            <DigitColumn char={ch} style={style} animateOnMount={animateOnMount} testID={testID ? `${testID}-${keys[i]}` : undefined} />
          ) : (
            <Text style={style}>{ch}</Text>
          )}
        </Animated.View>
      ))}
    </View>
  );
}

function DigitColumn({
  char,
  style,
  animateOnMount,
  testID,
}: {
  char: string;
  style: StyleProp<TextStyle>;
  animateOnMount: boolean;
  testID?: string;
}) {
  const [current, setCurrent] = useState(char);
  const [previous, setPrevious] = useState<string | null>(null);
  const direction = useSharedValue(1);
  const progress = useSharedValue(animateOnMount ? 0 : 1);
  const height = useSharedValue(0);
  const shownRef = useRef(char);

  useEffect(() => {
    if (animateOnMount) progress.value = withTiming(1, timingRoll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const old = shownRef.current;
    if (char === old) return;
    shownRef.current = char;
    direction.value = char < old ? -1 : 1;
    setPrevious(old);
    setCurrent(char);
    // Interrumpible: si ya iba rodando, el nuevo arranca de inmediato
    progress.value = 0;
    progress.value = withTiming(1, timingRoll);
  }, [char, direction, progress]);

  const onLayout = (e: LayoutChangeEvent) => {
    height.value = e.nativeEvent.layout.height;
  };

  const inStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: direction.value * (1 - progress.value) * height.value }],
  }));
  const outStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateY: -direction.value * progress.value * height.value }],
  }));

  return (
    <View style={styles.column} onLayout={onLayout}>
      {/* Reserva ancho y alto con el dígito actual; los visibles van encima */}
      <Text style={[style, styles.sizer]}>{current}</Text>
      {previous != null && (
        <Animated.View style={[StyleSheet.absoluteFill, outStyle]}>
          <Text style={style}>{previous}</Text>
        </Animated.View>
      )}
      <Animated.View style={[StyleSheet.absoluteFill, inStyle]}>
        <Text testID={testID} style={style}>{current}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline' },
  column: { overflow: 'hidden' },
  sizer: { opacity: 0 },
});
