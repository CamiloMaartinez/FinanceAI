import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useColors, radius, spacing, fonts } from '../../constants/theme';
import { hapticSave } from '../../utils/haptics';
import { AnimatedPressable } from './AnimatedPressable';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'plain' | 'destructive';
type Size = 'md' | 'sm';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Por defecto dispara un haptic ligero al presionar (§1, §13). Pasa `null` para silenciarlo. */
  haptic?: (() => void) | null;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  style,
  haptic = hapticSave,
}: ButtonProps) {
  const c = useColors();
  const s = useMemo(() => createStyles(c), [c]);

  const containerStyle = [
    s.base,
    size === 'sm' ? s.sizeSm : s.sizeMd,
    variant === 'primary' && s.primary,
    variant === 'secondary' && s.secondary,
    variant === 'destructive' && s.destructive,
    variant === 'plain' && s.plain,
    disabled && s.disabled,
    style,
  ];

  const textStyle = [
    s.text,
    size === 'sm' && s.textSm,
    variant === 'primary' && s.textPrimary,
    variant === 'secondary' && s.textSecondary,
    variant === 'destructive' && s.textDestructive,
    variant === 'plain' && s.textPlain,
  ];

  return (
    <AnimatedPressable
      style={containerStyle}
      disabled={disabled || loading}
      onPress={onPress}
      onPressFeedback={disabled || loading ? undefined : haptic ?? undefined}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading
        ? <ActivityIndicator size="small" color={variant === 'primary' ? c.onAccent : c.textPrimary} />
        : <Text style={textStyle}>{label}</Text>}
    </AnimatedPressable>
  );
}

function createStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    base: {
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    sizeMd: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
    sizeSm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
    primary: { backgroundColor: c.accent, ...c.shadow.sm },
    secondary: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
    destructive: { backgroundColor: c.expense },
    plain: { backgroundColor: 'transparent' },
    disabled: { opacity: 0.4 },
    text: { fontSize: 16, fontFamily: fonts.semibold, letterSpacing: -0.2 },
    textSm: { fontSize: 13 },
    textPrimary: { color: c.onAccent },
    textSecondary: { color: c.textPrimary },
    textDestructive: { color: c.background },
    textPlain: { color: c.accent },
  });
}
