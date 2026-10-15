import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { timingShake } from '../constants/motion';
import { useColors, spacing } from '../constants/theme';
import { Keypad, KEY_DELETE, PIN_KEYS } from './ui/Keypad';

interface PinPadProps {
  onComplete: (pin: string) => void;
  error?: boolean;
}

export function PinPad({ onComplete, error }: PinPadProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const [digits, setDigits] = useState<string[]>([]);

  // PIN incorrecto: los puntos tiemblan de lado a lado (I3)
  const shake = useSharedValue(0);
  useEffect(() => {
    if (!error) return;
    shake.value = withSequence(
      withTiming(-10, timingShake),
      withTiming(10, timingShake),
      withTiming(-7, timingShake),
      withTiming(7, timingShake),
      withTiming(0, timingShake),
    );
  }, [error, shake]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const handleKey = (key: string) => {
    if (key === KEY_DELETE) {
      setDigits((prev) => prev.slice(0, -1));
      return;
    }
    if (digits.length >= 4) return;
    const next = [...digits, key];
    setDigits(next);
    if (next.length === 4) {
      const pin = next.join('');
      setTimeout(() => onComplete(pin), 120); // deja ver el último punto lleno antes de validar
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.dotsRow, shakeStyle]}
        accessible
        accessibilityLabel={`${digits.length} de 4 dígitos`}
        accessibilityLiveRegion="polite"
      >
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              digits.length > i && styles.dotFilled,
              error && styles.dotError,
            ]}
          />
        ))}
      </Animated.View>

      <Keypad keys={PIN_KEYS} onKey={handleKey} style={styles.grid} />
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.xl },
  dotsRow: { flexDirection: 'row', gap: spacing.md },
  dot: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 1.5, borderColor: c.borderStrong,
  },
  dotFilled: { backgroundColor: c.accent, borderColor: c.accent },
  dotError: { backgroundColor: c.expense, borderColor: c.expense },
  grid: { width: 260 },
});
