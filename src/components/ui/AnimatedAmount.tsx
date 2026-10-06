import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text as RNText, TextInput, View, type StyleProp, type TextInputProps, type ViewProps, type ViewStyle } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { useColors, fonts, tabularNums } from '../../constants/theme';
import { timingCountUp } from '../../constants/motion';
import { splitAmount } from './AmountText';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// En Android el espacio extra de la fuente desalinea la base del texto
const noFontPadding = Platform.OS === 'android' ? { includeFontPadding: false } : null;

/**
 * Parte entera con puntos de miles ("1.234.567"), sin signo. Es un worklet:
 * corre en el hilo de UI en cada cuadro, así que nada de regex ni Intl.
 */
export function formatIntegerWorklet(value: number, decimals = 0): string {
  'worklet';
  const abs = Math.abs(value);
  // Con decimales el entero se trunca (los decimales se muestran aparte);
  // sin decimales se redondea igual que splitAmount
  const n = decimals > 0 ? Math.floor(Math.round(abs * 10 ** decimals) / 10 ** decimals) : Math.round(abs);
  const digits = String(n);
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += '.';
    out += digits[i];
  }
  return out;
}

interface AnimatedAmountProps {
  value: number;
  currency?: string;
  /** Tamaño de la parte entera. */
  size?: number;
  decimals?: number;
  color?: string;
  mutedColor?: string;
  /** Cuenta desde 0 al montar (Inicio) o empieza ya en el valor (tarjetas). */
  animateOnMount?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** Acciones para el lector de pantalla (p. ej. "Actualizar" en Inicio). */
  accessibilityActions?: ViewProps['accessibilityActions'];
  onAccessibilityAction?: ViewProps['onAccessibilityAction'];
}

/**
 * Monto que cuenta hasta su valor en el hilo de UI: un shared value va
 * hacia `value` con withTiming y un TextInput de solo lectura pinta cada
 * cuadro (el patrón de Reanimated para texto animado, sin re-renders de
 * React). Si el valor cambia a mitad de camino, sigue desde donde iba.
 * Mismo estilo que AmountText: símbolo pequeño y decimales suaves.
 */
export function AnimatedAmount({
  value,
  currency = 'COP',
  size = 40,
  decimals,
  color,
  mutedColor,
  animateOnMount = true,
  style,
  testID,
  accessibilityActions,
  onAccessibilityAction,
}: AnimatedAmountProps) {
  const c = useColors();
  const parts = splitAmount(value, currency, { decimals });
  const fractionDigits = decimals ?? (currency === 'COP' ? 0 : 2);
  const main = color ?? c.textPrimary;
  const muted = mutedColor ?? c.textTertiary;
  const full = `${parts.sign}${parts.symbol}${parts.integer}${parts.fraction}`;

  const shown = useSharedValue(animateOnMount ? 0 : value);
  // Mientras cuenta entre dos valores, el texto nunca es más ancho que el
  // mayor de los dos: con ese reservamos el ancho (un TextInput no se
  // vuelve a medir cuando su texto cambia desde el hilo de UI)
  const previous = useRef(animateOnMount ? 0 : value);
  const widest = formatIntegerWorklet(Math.max(Math.abs(previous.current), Math.abs(value)), fractionDigits);

  useEffect(() => {
    // Interrumpible: withTiming arranca desde el valor que se esté mostrando
    shown.value = withTiming(value, timingCountUp);
    previous.current = value;
  }, [value, shown]);

  const animatedProps = useAnimatedProps(() => {
    const text = formatIntegerWorklet(shown.value, fractionDigits);
    return { text, defaultValue: text } as unknown as TextInputProps;
  });

  // Los saldos muy largos se achican para caber, como adjustsFontSizeToFit
  const fontSize = full.length > 11 ? Math.round(size * (11 / full.length)) : size;
  const digitStyle = {
    fontFamily: fonts.extrabold,
    fontSize,
    letterSpacing: fontSize >= 28 ? -1 : -0.3,
    color: main,
    ...noFontPadding,
  };

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={full}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      style={[styles.row, style]}
    >
      <RNText style={[{ fontFamily: fonts.semibold, fontSize: Math.round(fontSize * 0.6), color: muted }, noFontPadding]}>
        {parts.sign}{parts.symbol}
      </RNText>
      <View>
        {/* Reserva el ancho y la altura; el número visible va encima */}
        <RNText style={[digitStyle, tabularNums, styles.sizer]} importantForAccessibility="no">
          {widest}
        </RNText>
        <AnimatedTextInput
          editable={false}
          pointerEvents="none"
          caretHidden
          underlineColorAndroid="transparent"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          defaultValue={formatIntegerWorklet(previous.current, fractionDigits)}
          animatedProps={animatedProps}
          testID={testID ? `${testID}-cifras` : undefined}
          style={[digitStyle, tabularNums, styles.input]}
        />
      </View>
      {parts.fraction !== '' && (
        <RNText style={[digitStyle, tabularNums, { color: muted }]}>{parts.fraction}</RNText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline' },
  sizer: { opacity: 0 },
  input: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 0, margin: 0, textAlignVertical: 'center' },
});
