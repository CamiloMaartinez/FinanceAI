import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { springPress } from '../../constants/motion';
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  /** Escala al presionar. 0.97 por defecto (apple-design §4). */
  pressScale?: number;
  /** Se dispara en pressIn, no en press — el feedback debe ser instantáneo (§1). */
  onPressFeedback?: () => void;
  children?: React.ReactNode;
}

/**
 * Base de cualquier elemento tocable del proyecto. Responde en pressIn
 * (no en release), anima desde el valor actual con un resorte crítico, y
 * cae a solo-opacidad cuando el sistema pide movimiento reducido (§14).
 */
export function AnimatedPressable({
  style,
  pressScale = 0.97,
  onPressFeedback,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const { reduceMotion } = useAccessibilityPreferences();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressableBase
      style={[style, !reduceMotion && animatedStyle]}
      onPressIn={(e) => {
        scale.value = withSpring(pressScale, springPress);
        onPressFeedback?.();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, springPress);
        onPressOut?.(e);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressableBase>
  );
}
