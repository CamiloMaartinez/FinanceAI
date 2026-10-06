import React, { useEffect } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useColors, fonts, radius } from '../../constants/theme';
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences';
import { hapticToggle } from '../../utils/haptics';
import { AnimatedPressable } from './AnimatedPressable';
import { Text } from './Text';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  /** Nombre accesible, si la etiqueta visible es una abreviatura ("7d" → "7 días"). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Píldora seleccionable; el fondo pasa a celeste con un fundido corto. */
export function Chip({ label, selected = false, onPress, accessibilityLabel, style }: ChipProps) {
  const c = useColors();
  const { reduceMotion } = useAccessibilityPreferences();
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, { duration: reduceMotion ? 0 : 180 });
  }, [selected, reduceMotion, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ['rgba(0,0,0,0)', c.chip]),
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressFeedback={hapticToggle}
      pressScale={0.94}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      hitSlop={4}
      style={[
        {
          paddingHorizontal: 14,
          paddingVertical: 7,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
        },
        animatedStyle,
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: selected ? fonts.semibold : fonts.medium,
          fontSize: 13,
          color: selected ? c.onChip : c.textSecondary,
        }}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}
