import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from './ui/Text';
import { TextInput } from './ui/TextInput';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, interpolateColor, withSpring } from 'react-native-reanimated';
import { useColors, spacing, radius, SWATCHES } from '../constants/theme';
import { springDefault } from '../constants/motion';
import type { Goal } from '../models/types';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { hapticSave, hapticToggle } from '../utils/haptics';

interface GoalFormProps {
  visible: boolean;
  editingGoal?: Goal | null;
  onClose: () => void;
  onSave: (
    name: string,
    targetAmount: number,
    targetDate: string,
    priority: string,
    colorHex: string,
    iconName: string
  ) => void;
}

const GOAL_ICONS = [
  { value: 'laptop-outline',       label: 'Tecnología' },
  { value: 'airplane-outline',     label: 'Viaje'       },
  { value: 'shield-checkmark-outline', label: 'Emergencia' },
  { value: 'car-outline',          label: 'Vehículo'    },
  { value: 'home-outline',         label: 'Hogar'       },
  { value: 'school-outline',       label: 'Estudios'    },
  { value: 'gift-outline',         label: 'Regalo'      },
  { value: 'star-outline',         label: 'Otro'        },
];

const GOAL_COLORS = [
  ...SWATCHES,
];

const PRIORITIES = [
  { value: 'low',    label: 'Baja'  },
  { value: 'medium', label: 'Media' },
  { value: 'high',   label: 'Alta'  },
];

// Ofrece 3 fechas rápidas: 3, 6 y 12 meses desde hoy
function getQuickDate(monthsAhead: number): string {
  // Ajustado al último día del mes: el 31 de agosto + 3 meses es el 30 de
  // noviembre, no el 1 de diciembre como daría setMonth
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth() + monthsAhead, 1, 12);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(today.getDate(), lastDay));
  return target.toISOString();
}

// Anillo de foco animado (§4/§15 apple-design).
function useFocusRing(c: ReturnType<typeof useColors>) {
  const focus = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [c.border, c.accent]),
  }));
  return {
    style,
    onFocus: () => { focus.value = withSpring(1, springDefault); },
    onBlur: () => { focus.value = withSpring(0, springDefault); },
  };
}

export function GoalForm({ visible, editingGoal, onClose, onSave }: GoalFormProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const isEditing = !!editingGoal;
  const [name,         setName]         = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate,   setTargetDate]   = useState(getQuickDate(6));
  const [priority,     setPriority]     = useState('medium');
  const [colorHex,     setColorHex]     = useState(SWATCHES[2]);
  const [iconName,     setIconName]     = useState('star-outline');
  const [error,        setError]        = useState('');

  const nameRing = useFocusRing(c);
  const amountRing = useFocusRing(c);

  // Precarga los datos cuando se abre en modo edición
  useEffect(() => {
    if (visible && editingGoal) {
      setName(editingGoal.name);
      setTargetAmount(String(Math.round(editingGoal.targetAmount)));
      setTargetDate(editingGoal.targetDate);
      setPriority(editingGoal.priority);
      setColorHex(editingGoal.colorHex);
      setIconName(editingGoal.iconName);
      setError('');
    }
  }, [visible, editingGoal]);

  const handleSave = () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    const amountNum = parseFloat(targetAmount.replace(/\./g, '').replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Ingresa un monto objetivo válido');
      return;
    }

    onSave(name.trim(), amountNum, targetDate, priority, colorHex, iconName);
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setTargetAmount('');
    setTargetDate(getQuickDate(6));
    setPriority('medium');
    setColorHex(SWATCHES[2]);
    setIconName('star-outline');
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <AnimatedPressable onPress={handleClose}>
            <Text style={styles.cancelBtn}>Cancelar</Text>
          </AnimatedPressable>
          <Text style={styles.headerTitle}>{isEditing ? 'Editar meta' : 'Nueva meta'}</Text>
          <AnimatedPressable onPress={handleSave} onPressFeedback={hapticSave}>
            <Text style={styles.saveBtn}>Guardar</Text>
          </AnimatedPressable>
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Nombre */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nombre de la meta</Text>
            <Animated.View style={[styles.input, nameRing.style]}>
              <TextInput
                style={styles.inputText}
                placeholder="Ej: Fondo de emergencia"
                placeholderTextColor={c.textTertiary}
                value={name}
                onChangeText={(text) => { setName(text); setError(''); }}
                onFocus={nameRing.onFocus}
                onBlur={nameRing.onBlur}
                autoFocus
              />
            </Animated.View>
          </View>

          {/* Monto objetivo */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Monto objetivo</Text>
            <Animated.View style={[styles.amountWrapper, amountRing.style]}>
              <Text style={styles.amountPrefix}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={c.textTertiary}
                value={targetAmount}
                onChangeText={(text) => { setTargetAmount(text); setError(''); }}
                onFocus={amountRing.onFocus}
                onBlur={amountRing.onBlur}
                keyboardType="numeric"
              />
            </Animated.View>
          </View>

          {/* Fecha objetivo - selección rápida */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Fecha objetivo</Text>
            <View style={styles.chipRow}>
              {[3, 6, 12].map((months) => {
                const dateStr = getQuickDate(months);
                const isSelected = targetDate === dateStr;
                return (
                  <AnimatedPressable
                    key={months}
                    pressScale={0.97}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setTargetDate(dateStr)}
                    onPressFeedback={hapticToggle}
                  >
                    <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                      {months} meses
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          {/* Prioridad */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Prioridad</Text>
            <View style={styles.chipRow}>
              {PRIORITIES.map((p) => (
                <AnimatedPressable
                  key={p.value}
                  pressScale={0.97}
                  style={[styles.chip, priority === p.value && styles.chipSelected]}
                  onPress={() => setPriority(p.value)}
                  onPressFeedback={hapticToggle}
                >
                  <Text style={[styles.chipLabel, priority === p.value && styles.chipLabelSelected]}>
                    {p.label}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>

          {/* Ícono */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Ícono</Text>
            <View style={styles.iconGrid}>
              {GOAL_ICONS.map((icon) => (
                <AnimatedPressable accessibilityRole="radio" accessibilityLabel={icon.label} accessibilityState={{ selected: iconName === icon.value }}
                  key={icon.value}
                  pressScale={0.94}
                  style={[
                    styles.iconOption,
                    iconName === icon.value && {
                      backgroundColor: colorHex + '20',
                      borderColor: colorHex,
                    },
                  ]}
                  onPress={() => setIconName(icon.value)}
                  onPressFeedback={hapticToggle}
                >
                  <Ionicons
                    name={icon.value as any}
                    size={22}
                    color={iconName === icon.value ? colorHex : c.textSecondary}
                  />
                </AnimatedPressable>
              ))}
            </View>
          </View>

          {/* Color */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Color</Text>
            <View style={styles.colorGrid}>
              {GOAL_COLORS.map((hex) => (
                <AnimatedPressable accessibilityRole="radio" accessibilityLabel={`Color ${GOAL_COLORS.indexOf(hex) + 1}`} accessibilityState={{ selected: colorHex === hex }}
                  key={hex}
                  pressScale={0.9}
                  style={[
                    styles.colorDot,
                    { backgroundColor: hex },
                    colorHex === hex && styles.colorDotSelected,
                  ]}
                  onPress={() => setColorHex(hex)}
                  onPressFeedback={hapticToggle}
                >
                  {colorHex === hex && <Ionicons name="checkmark" size={16} color={c.onPrimary} />}
                </AnimatedPressable>
              ))}
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: c.textPrimary },
  cancelBtn: { fontSize: 16, color: c.textSecondary },
  saveBtn: { fontSize: 16, fontWeight: '600', color: c.accent },
  form: { padding: spacing.lg },
  errorBox: {
    backgroundColor: c.expense + '26',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { fontSize: 13, color: c.expense },
  field: { marginBottom: spacing.xl },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  inputText: {
    padding: spacing.lg,
    fontSize: 16,
    color: c.textPrimary,
  },
  amountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: c.border,
    paddingHorizontal: spacing.lg,
  },
  amountPrefix: {
    fontSize: 28,
    fontWeight: '700',
    color: c.textSecondary,
    marginRight: spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: c.textPrimary,
    paddingVertical: spacing.lg,
  },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    backgroundColor: c.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipSelected: {
    borderColor: c.accent,
    backgroundColor: c.accent + '1A',
  },
  chipLabel: { fontSize: 13, color: c.textSecondary },
  chipLabelSelected: { color: c.accent, fontWeight: '600' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: { borderWidth: 3, borderColor: c.surface },
});
