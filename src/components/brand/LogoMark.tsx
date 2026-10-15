import React from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useColors, fonts } from '../../constants/theme';

// La "S" de Smart Finance recortada del original (scripts/brand-assets.cjs).
// Está pensada para fondos oscuros: sobre claro el borde deja un halo leve.
const MARK = require('../../../assets/brand/logo-mark.png');
const MARK_RATIO = 498 / 471;

interface LogoMarkProps {
  /** Alto del símbolo. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Símbolo de la marca. Decorativo: quien lo use pone el texto accesible. */
export function LogoMark({ size = 64, style }: LogoMarkProps) {
  return (
    <View style={style} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image source={MARK} style={{ width: size * MARK_RATIO, height: size }} resizeMode="contain" />
    </View>
  );
}

interface LogoWordmarkProps {
  /** Alto del símbolo; el texto se escala con él. */
  size?: number;
  /** Muestra "FINANZAS DE ALTURA" debajo. */
  tagline?: boolean;
  /** Mientras Outfit no cargue (splash), se usa la fuente del sistema. */
  fontsReady?: boolean;
}

/** Símbolo + "Smart Finance", como el logotipo. Se lee como un solo texto. */
export function LogoWordmark({ size = 56, tagline = false, fontsReady = true }: LogoWordmarkProps) {
  const c = useColors();
  const font = (family: string, weight: '500' | '800') => (fontsReady ? { fontFamily: family } : { fontWeight: weight });
  const wordSize = size * 0.5;
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="Smart Finance" style={styles.column}>
      <View style={styles.row}>
        <LogoMark size={size} />
        <View>
          <Text style={[{ fontSize: wordSize, lineHeight: wordSize * 1.05, color: c.lavender }, font(fonts.medium, '500')]}>
            Smart
          </Text>
          <Text style={[{ fontSize: wordSize, lineHeight: wordSize * 1.05, color: c.peach, letterSpacing: -0.5 }, font(fonts.extrabold, '800')]}>
            Finance
          </Text>
        </View>
      </View>
      {tagline && (
        <Text style={[styles.tagline, { color: c.lavender }, font(fonts.medium, '500')]}>FINANZAS DE ALTURA</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { alignItems: 'center', gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tagline: { fontSize: 11, letterSpacing: 4 },
});
