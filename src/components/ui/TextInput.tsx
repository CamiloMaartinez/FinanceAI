import React, { forwardRef } from 'react';
import { StyleSheet, TextInput as RNTextInput, type TextInputProps, type TextStyle } from 'react-native';
import { fonts, fontForWeight } from '../../constants/theme';

/**
 * TextInput con Outfit, igual que ui/Text: convierte `fontWeight` en la
 * familia del peso. Reemplazo directo del de React Native (acepta ref).
 */
export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const { fontWeight, fontFamily, ...others } = flat;
  const family = fontWeight != null ? fontForWeight(fontWeight) : fontFamily ?? fonts.regular;
  return <RNTextInput ref={ref} style={[others, { fontFamily: family }]} {...rest} />;
});
