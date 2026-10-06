import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '../../constants/theme';
import { hapticToggle } from '../../utils/haptics';
import { AnimatedPressable } from './AnimatedPressable';

/** Flecha para volver, en las pantallas que se abren desde "Más". */
export function BackButton() {
  const c = useColors();
  return (
    <AnimatedPressable
      onPress={() => (router.canGoBack() ? router.back() : router.navigate('/more'))}
      onPressFeedback={hapticToggle}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Volver"
      style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface }}
    >
      <Ionicons name="chevron-back" size={20} color={c.textPrimary} />
    </AnimatedPressable>
  );
}
