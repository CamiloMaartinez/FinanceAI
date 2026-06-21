import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../constants/theme';

interface GoalFormProps {
  visible: boolean;
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
  '#007AFF', '#34C759', '#FF9500', '#5856D6',
  '#FF3B30', '#30B0C7', '#FF2D55', '#AC8E68',
];

const PRIORITIES = [
  { value: 'low',    label: 'Baja'  },
  { value: 'medium', label: 'Media' },
  { value: 'high',   label: 'Alta'  },
];

// Ofrece 3 fechas rápidas: 3, 6 y 12 meses desde hoy
function getQuickDate(monthsAhead: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsAhead);
  return date.toISOString();
}

export function GoalForm({ visible, onClose, onSave }: GoalFormProps) {
  const [name,         setName]         = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate,   setTargetDate]   = useState(getQuickDate(6));
  const [priority,     setPriority]     = useState('medium');
  const [colorHex,     setColorHex]     = useState('#007AFF');
  const [iconName,     setIconName]     = useState('star-outline');
  const [error,        setError]        = useState('');

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
    setColorHex('#007AFF');
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
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelBtn}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nueva meta</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveBtn}>Guardar</Text>
          </TouchableOpacity>
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
            <TextInput
              style={styles.input}
              placeholder="Ej: Fondo de emergencia"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={(text) => { setName(text); setError(''); }}
              autoFocus
            />
          </View>

          {/* Monto objetivo */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Monto objetivo</Text>
            <View style={styles.amountWrapper}>
              <Text style={styles.amountPrefix}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                value={targetAmount}
                onChangeText={(text) => { setTargetAmount(text); setError(''); }}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Fecha objetivo - selección rápida */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Fecha objetivo</Text>
            <View style={styles.chipRow}>
              {[3, 6, 12].map((months) => {
                const dateStr = getQuickDate(months);
                const isSelected = targetDate === dateStr;
                return (
                  <TouchableOpacity
                    key={months}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setTargetDate(dateStr)}
                  >
                    <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                      {months} meses
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Prioridad */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Prioridad</Text>
            <View style={styles.chipRow}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.chip, priority === p.value && styles.chipSelected]}
                  onPress={() => setPriority(p.value)}
                >
                  <Text style={[styles.chipLabel, priority === p.value && styles.chipLabelSelected]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Ícono */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Ícono</Text>
            <View style={styles.iconGrid}>
              {GOAL_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon.value}
                  style={[
                    styles.iconOption,
                    iconName === icon.value && {
                      backgroundColor: colorHex + '20',
                      borderColor: colorHex,
                    },
                  ]}
                  onPress={() => setIconName(icon.value)}
                >
                  <Ionicons
                    name={icon.value as any}
                    size={22}
                    color={iconName === icon.value ? colorHex : colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Color */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Color</Text>
            <View style={styles.colorGrid}>
              {GOAL_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    colorHex === c && styles.colorDotSelected,
                  ]}
                  onPress={() => setColorHex(c)}
                >
                  {colorHex === c && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  cancelBtn: { fontSize: 16, color: colors.textSecondary },
  saveBtn: { fontSize: 16, fontWeight: '600', color: colors.blue },
  form: { padding: spacing.lg },
  errorBox: {
    backgroundColor: 'rgba(255,59,48,0.15)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { fontSize: 13, color: colors.expense },
  field: { marginBottom: spacing.xl },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    fontSize: 16,
    color: colors.textPrimary,
  },
  amountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  amountPrefix: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingVertical: spacing.lg,
  },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipSelected: {
    borderColor: colors.blue,
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  chipLabel: { fontSize: 13, color: colors.textSecondary },
  chipLabelSelected: { color: colors.blue, fontWeight: '600' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
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
  colorDotSelected: { borderWidth: 3, borderColor: '#fff' },
});