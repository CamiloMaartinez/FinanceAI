import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors, fonts, spacing } from '../../constants/theme';
import { hapticToggle } from '../../utils/haptics';
import { AnimatedPressable } from './AnimatedPressable';
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
      {back && (
        <AnimatedPressable
          onPress={() => (router.canGoBack() ? router.back() : router.navigate('/more'))}
          onPressFeedback={hapticToggle}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={[styles.back, { backgroundColor: c.surface }]}
        >
          <Ionicons name="chevron-back" size={20} color={c.textPrimary} />
        </AnimatedPressable>
      )}
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
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1 },
  eyebrow: { fontFamily: fonts.medium, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 2 },
  title: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
});
