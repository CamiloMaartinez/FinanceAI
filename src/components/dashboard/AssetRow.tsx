import React, { useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useColors, spacing, fonts, tabularNums, type ThemeColors } from '../../constants/theme';
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences';
import { hapticToggle } from '../../utils/haptics';
import { AnimatedPressable } from '../ui/AnimatedPressable';
import { Text } from '../ui/Text';
import type { CardRect } from '../AccountCard';
import { measureOrigin } from '../../utils/accountNavigation';

interface AssetRowProps {
  /** El círculo pastel con el ícono (IconBadge). */
  badge: React.ReactNode;
  title: string;
  detail?: string;
  amount: string;
  amountColor?: string;
  /** Línea pequeña bajo el monto: variación o fecha. */
  change?: string;
  changeColor?: string;
  /** Posición en la lista, para la entrada escalonada. */
  index?: number;
  /** Recibe dónde está la fila en pantalla (para animar lo que abre desde ahí). */
  onPress?: (origin: CardRect | null) => void;
  accessibilityLabel?: string;
}

/**
 * Fila de la hoja del dashboard: ícono en círculo pastel, nombre y detalle
 * gris a la izquierda; monto y variación de color a la derecha.
 */
export function AssetRow({
  badge, title, detail, amount, amountColor, change, changeColor, index = 0, onPress, accessibilityLabel,
}: AssetRowProps) {
  const c = useColors();
  const s = useMemo(() => createStyles(c), [c]);
  const { reduceMotion } = useAccessibilityPreferences();
  const label = accessibilityLabel ?? [title, detail, amount, change].filter(Boolean).join(', ');
  const ref = useRef<View>(null);

  const handlePress = () => {
    if (!onPress) return;
    measureOrigin(ref.current, onPress);
  };

  const content = (
    <>
      {badge}
      <View style={s.info}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        {!!detail && <Text style={s.detail} numberOfLines={1}>{detail}</Text>}
      </View>
      <View style={s.right}>
        <Text style={[s.amount, amountColor ? { color: amountColor } : null]} numberOfLines={1}>{amount}</Text>
        {!!change && <Text style={[s.change, { color: changeColor ?? c.textSecondary }]}>{change}</Text>}
      </View>
    </>
  );

  return (
    <Animated.View ref={ref} collapsable={false} entering={reduceMotion ? undefined : FadeInDown.duration(320).delay(Math.min(index, 8) * 55)}>
      {onPress ? (
        <AnimatedPressable
          style={s.row}
          onPress={handlePress}
          onPressFeedback={hapticToggle}
          pressScale={0.98}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          {content}
        </AnimatedPressable>
      ) : (
        <View style={s.row} accessible accessibilityLabel={label}>{content}</View>
      )}
    </Animated.View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
    info: { flex: 1 },
    title: { fontFamily: fonts.semibold, fontSize: 15, color: c.textPrimary },
    detail: { fontFamily: fonts.regular, fontSize: 12, color: c.textSecondary, marginTop: 2 },
    right: { alignItems: 'flex-end', maxWidth: '45%' },
    amount: { fontFamily: fonts.bold, fontSize: 15, color: c.textPrimary, ...tabularNums },
    change: { fontFamily: fonts.medium, fontSize: 12, marginTop: 2, ...tabularNums },
  });
}
