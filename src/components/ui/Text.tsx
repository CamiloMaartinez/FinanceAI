import React from 'react';
import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { fonts, fontForWeight } from '../../constants/theme';

const OUTFIT = new Set<string>(Object.values(fonts));

/**
 * Text con Outfit por defecto. Convierte `fontWeight` en la familia del
 * peso correspondiente (Outfit_600SemiBold…) y quita `fontWeight`, porque
 * con fuentes propias Android ignora el peso o inventa una negrita falsa.
 * Es un reemplazo directo del Text de React Native.
 */
export function Text({ style, ...rest }: TextProps) {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const { fontWeight, fontFamily, ...others } = flat;

  // Una familia ajena a Outfit (p. ej. monoespaciada) se respeta tal cual
  if (fontFamily && !OUTFIT.has(fontFamily)) {
    return <RNText style={flat} {...rest} />;
  }

  const family = fontWeight != null ? fontForWeight(fontWeight) : fontFamily ?? fonts.regular;
  return <RNText style={[others, { fontFamily: family }]} {...rest} />;
}
