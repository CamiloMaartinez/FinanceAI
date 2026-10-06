import React, { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, fonts, type ThemeColors } from '../../constants/theme';
import { hapticSave } from '../../utils/haptics';
import { AnimatedPressable } from './AnimatedPressable';
import { Text } from './Text';

interface CircleActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  /** Se muestra debajo del círculo y es el nombre accesible del botón. */
  label: string;
  /** Si es false, la etiqueta no se ve pero se sigue anunciando. */
  showLabel?: boolean;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
  /** Color de la etiqueta (sobre el encabezado, usa `heroText`). */
  labelColor?: string;
  style?: StyleProp<ViewStyle>;
}

/** Botón circular oscuro con ícono, como recibir / enviar / transferir en la referencia. */
export function CircleAction({
  icon,
  label,
  showLabel = true,
  onPress,
  size = 56,
  disabled,
  labelColor,
  style,
}: CircleActionProps) {
  const c = useColors();
  const s = useMemo(() => createStyles(c), [c]);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressFeedback={disabled ? undefined : hapticSave}
      pressScale={0.92}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={6}
      style={[s.wrap, disabled && s.disabled, style]}
    >
      <View style={[s.circle, { width: size, height: size, borderRadius: size / 2 }]}>
        <Ionicons name={icon} size={Math.round(size * 0.4)} color={c.onAction} />
      </View>
      {showLabel && (
        <Text style={[s.label, { color: labelColor ?? c.textPrimary }]} numberOfLines={1}>
          {label}
        </Text>
      )}
    </AnimatedPressable>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', gap: 6 },
    circle: {
      backgroundColor: c.actionBg,
      alignItems: 'center',
      justifyContent: 'center',
      ...c.shadow.sm,
    },
    label: { fontFamily: fonts.medium, fontSize: 12 },
    disabled: { opacity: 0.4 },
  });
}
