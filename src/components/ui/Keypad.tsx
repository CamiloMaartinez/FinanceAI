import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, ReduceMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColors, fonts, radius } from '../../constants/theme';
import { hapticToggle } from '../../utils/haptics';
import { Text } from './Text';

/** Tecla especial de borrar; '' deja el hueco vacío. */
export const KEY_DELETE = 'del';

export const PIN_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', KEY_DELETE];

// Rebote al soltar: un resorte con poco amortiguamiento
const bounce = { dampingRatio: 0.42, duration: 420, reduceMotion: ReduceMotion.System };

interface KeypadProps {
  /** 12 teclas en orden (4 filas de 3). */
  keys: string[];
  onKey: (key: string) => void;
  /** Mantener presionado borrar: borra todo. */
  onClear?: () => void;
  /** 'plain' = teclas sin fondo (PIN); 'rounded' = teclas redondeadas con borde (montos). */
  variant?: 'plain' | 'rounded';
  keyHeight?: number;
  style?: StyleProp<ViewStyle>;
}

/** Teclado numérico de 4×3: rebota y vibra en cada tecla. */
export function Keypad({ keys, onKey, onClear, variant = 'plain', keyHeight = 64, style }: KeypadProps) {
  return (
    <View style={[styles.grid, style]}>
      {keys.map((k, i) =>
        k === '' ? (
          <View key={i} style={[styles.cell, { height: keyHeight }]} />
        ) : (
          <KeypadKey
            key={i}
            value={k}
            onPress={() => onKey(k)}
            onLongPress={k === KEY_DELETE ? onClear : undefined}
            variant={variant}
            height={keyHeight}
          />
        )
      )}
    </View>
  );
}

function KeypadKey({ value, onPress, onLongPress, variant, height }: {
  value: string; onPress: () => void; onLongPress?: () => void; variant: 'plain' | 'rounded'; height: number;
}) {
  const c = useColors();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const isDelete = value === KEY_DELETE;
  const label = isDelete ? 'Borrar' : value === ',' ? 'Coma decimal' : value;

  return (
    <View style={[styles.cell, { height }]}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => {
          hapticToggle();
          scale.value = withTiming(0.86, { duration: 70, reduceMotion: ReduceMotion.System });
        }}
        onPressOut={() => { scale.value = withSpring(1, bounce); }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={isDelete && onLongPress ? 'Mantén presionado para borrar todo' : undefined}
        style={styles.pressable}
      >
        <Animated.View
          style={[
            styles.key,
            variant === 'rounded' && {
              backgroundColor: c.surface,
              borderRadius: radius.key,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: c.borderStrong,
            },
            animated,
          ]}
        >
          {isDelete ? (
            <Ionicons name="backspace-outline" size={24} color={c.textSecondary} />
          ) : (
            <Text style={[styles.keyText, { color: c.textPrimary }]}>{value}</Text>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%' },
  cell: { width: '33.333%', padding: 5 },
  pressable: { flex: 1 },
  key: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontFamily: fonts.semibold, fontSize: 28 },
});
