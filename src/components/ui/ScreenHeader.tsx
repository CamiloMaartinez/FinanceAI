import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useColors, fonts, spacing } from '../../constants/theme';
import { BackButton } from './BackButton';
import { Text } from './Text';

interface ScreenHeaderProps {
  title: string;
  /** Texto pequeño sobre el título ("MÁS", "MÓDULOS"…). */
  eyebrow?: string;
  /** Muestra la flecha para volver (pantallas que se abren desde "Más"). */
  back?: boolean;
  /** Elemento a la derecha: un botón de agregar, un filtro… */
  right?: React.ReactNode;
}

/** Encabezado común de las pantallas: título grueso y acciones a los lados. */
export function ScreenHeader({ title, eyebrow, back, right }: ScreenHeaderProps) {
  const c = useColors();
  return (
    <View style={styles.row}>
      {back && <BackButton />}
      <View style={styles.titles}>
        {!!eyebrow && <Text style={[styles.eyebrow, { color: c.textSecondary }]}>{eyebrow}</Text>}
        <Text style={[styles.title, { color: c.textPrimary }]} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  titles: { flex: 1 },
  eyebrow: { fontFamily: fonts.medium, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 2 },
  title: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
});
