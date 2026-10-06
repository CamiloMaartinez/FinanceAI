import React from 'react';
import { Text as RNText, type StyleProp, type TextStyle } from 'react-native';
import { useColors, fonts, tabularNums } from '../../constants/theme';
import { getCurrencyInfo } from '../../constants/currencies';

export interface AmountParts {
  sign: '' | '+' | '−';
  symbol: string;
  integer: string;
  /** Incluye la coma decimal (",50") o queda vacío si no hay decimales. */
  fraction: string;
}

/**
 * Separa un monto en sus partes para pintarlas con pesos distintos.
 * Formato colombiano: punto para miles y coma para decimales.
 * COP no muestra decimales por defecto; USD y EUR muestran dos.
 */
export function splitAmount(
  value: number,
  currency = 'COP',
  options: { decimals?: number; showSign?: boolean } = {},
): AmountParts {
  const decimals = options.decimals ?? (currency === 'COP' ? 0 : 2);
  const factor = 10 ** decimals;
  const rounded = Math.round(Math.abs(value) * factor);
  const intPart = Math.floor(rounded / factor);
  const fracPart = rounded - intPart * factor;

  let sign: AmountParts['sign'] = '';
  if (value < 0 && rounded > 0) sign = '−';
  else if (options.showSign && rounded > 0) sign = '+';

  return {
    sign,
    symbol: getCurrencyInfo(currency).symbol,
    integer: intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
    fraction: decimals > 0 ? ',' + fracPart.toString().padStart(decimals, '0') : '',
  };
}

interface AmountTextProps {
  value: number;
  currency?: string;
  /** Tamaño de la parte entera. 40 (display) por defecto. */
  size?: number;
  decimals?: number;
  /** Antepone "+" a los positivos (para variaciones e ingresos). */
  showSign?: boolean;
  /** Color de la parte entera. Por defecto, el texto principal. */
  color?: string;
  /** Color del símbolo y los decimales. Por defecto, el texto terciario. */
  mutedColor?: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
}

/**
 * Monto con la parte entera en Outfit ExtraBold y el símbolo y los
 * decimales más claros, como en la referencia ("$1.284" + ",50" en gris).
 */
export function AmountText({
  value,
  currency = 'COP',
  size = 40,
  decimals,
  showSign,
  color,
  mutedColor,
  style,
  testID,
}: AmountTextProps) {
  const c = useColors();
  const parts = splitAmount(value, currency, { decimals, showSign });
  const main = color ?? c.textPrimary;
  const muted = mutedColor ?? c.textTertiary;
  const full = `${parts.sign}${parts.symbol}${parts.integer}${parts.fraction}`;

  return (
    <RNText
      testID={testID}
      accessibilityLabel={full}
      numberOfLines={1}
      adjustsFontSizeToFit
      style={[
        { fontFamily: fonts.extrabold, fontSize: size, lineHeight: Math.round(size * 1.15), letterSpacing: size >= 28 ? -1 : -0.3, color: main },
        tabularNums,
        style,
      ]}
    >
      {parts.sign}
      <RNText style={{ fontFamily: fonts.semibold, fontSize: Math.round(size * 0.6), color: muted }}>
        {parts.symbol}
      </RNText>
      {parts.integer}
      {parts.fraction !== '' && <RNText style={{ color: muted }}>{parts.fraction}</RNText>}
    </RNText>
  );
}
