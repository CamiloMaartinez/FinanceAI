import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text } from './ui/Text';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, radius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { hapticToggle } from '../utils/haptics';

interface DateFieldProps {
  value: Date;
  onChange: (date: Date) => void;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

// Selector de fecha de un movimiento: atajos "Hoy" / "Ayer" y el selector
// nativo para cualquier otra fecha. No permite fechas futuras.
export function DateField({ value, onChange }: DateFieldProps) {
  const c = useColors();
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);

  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const isToday = isSameDay(value, today);
  const isYesterday = isSameDay(value, yesterday);
  const isOther = !isToday && !isYesterday;

  const openAndroidPicker = () => {
    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      maximumDate: today,
      onValueChange: (_event, date) => onChange(date),
    });
  };

  const chip = (label: string, active: boolean, onPress: () => void) => (
    <AnimatedPressable
      pressScale={0.97}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      onPressFeedback={hapticToggle}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </AnimatedPressable>
  );

  return (
    <View style={styles.row}>
      {chip('Hoy', isToday, () => onChange(today))}
      {chip('Ayer', isYesterday, () => onChange(yesterday))}

      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value}
          mode="date"
          display="compact"
          maximumDate={today}
          locale="es-CO"
          themeVariant={isDark ? 'dark' : 'light'}
          accentColor={c.accent}
          onValueChange={(_event, date) => onChange(date)}
        />
      ) : (
        <AnimatedPressable
          pressScale={0.97}
          style={[styles.chip, isOther && styles.chipActive]}
          onPress={openAndroidPicker}
          onPressFeedback={hapticToggle}
        >
          <Ionicons name="calendar-outline" size={14} color={isOther ? c.textPrimary : c.textSecondary} />
          <Text style={[styles.chipLabel, isOther && styles.chipLabelActive]}>
            {isOther ? value.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : 'Otra fecha'}
          </Text>
        </AnimatedPressable>
      )}
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActive: {
    borderColor: c.accent,
    backgroundColor: c.accent + '1F',
  },
  chipLabel: {
    fontSize: 13,
    color: c.textSecondary,
  },
  chipLabelActive: {
    color: c.textPrimary,
    fontWeight: '600',
  },
});
