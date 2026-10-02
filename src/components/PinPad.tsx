import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing } from '../constants/theme';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { hapticToggle } from '../utils/haptics';

interface PinPadProps {
  onComplete: (pin: string) => void;
  error?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export function PinPad({ onComplete, error }: PinPadProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const [digits, setDigits] = useState<string[]>([]);

  const handlePress = (digit: string) => {
    if (digits.length >= 4) return;
    const next = [...digits, digit];
    setDigits(next);
    if (next.length === 4) {
      const pin = next.join('');
      setTimeout(() => onComplete(pin), 120); // deja ver el último punto lleno antes de validar
    }
  };

  const handleDelete = () => setDigits((prev) => prev.slice(0, -1));

  return (
    <View style={styles.container}>
      <View style={styles.dotsRow}>
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
      </View>

      <View style={styles.grid}>
        {KEYS.map((k, i) => {
          if (k === '') return <View key={i} style={styles.key} />;
          if (k === 'del') {
            return (
              <AnimatedPressable key={i} style={styles.key} onPress={handleDelete} onPressFeedback={hapticToggle} pressScale={0.92} hitSlop={8}>
                <Ionicons name="backspace-outline" size={22} color={c.textSecondary} />
              </AnimatedPressable>
            );
          }
          return (
            <AnimatedPressable key={i} style={styles.key} onPress={() => handlePress(k)} onPressFeedback={hapticToggle} pressScale={0.92}>
              <Text style={styles.keyText}>{k}</Text>
            </AnimatedPressable>
          );
        })}
      </View>
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
  dotFilled: { backgroundColor: c.blue, borderColor: c.blue },
  dotError: { backgroundColor: c.expense, borderColor: c.expense },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 260,
    justifyContent: 'center',
  },
  key: {
    width: 72,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 26, fontWeight: '400', color: c.textPrimary },
});
