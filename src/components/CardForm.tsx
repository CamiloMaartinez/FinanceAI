import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, interpolateColor, withSpring } from 'react-native-reanimated';
import { useColors, spacing, radius } from '../constants/theme';
import { springDefault } from '../constants/motion';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { hapticSave, hapticToggle } from '../utils/haptics';

interface CardFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (
    name: string,
    bank: string,
    annualFee: number,
    cashbackPercent: number,
    interestRate: number,
    benefits: string[],
    colorHex: string
  ) => void;
}

const CARD_COLORS = [
  '#1C1C2E', '#007AFF', '#34C759', '#FF9500',
  '#5856D6', '#FF3B30', '#30B0C7', '#FF2D55',
];

const COMMON_BENEFITS = [
  'Millas aéreas', 'Cashback', 'Sin cuota primer año',
  'Acceso a salas VIP', 'Seguro de viaje', 'Descuentos en restaurantes',
  'Puntos canjeables', 'Compras internacionales sin recargo',
];

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

export function CardForm({ visible, onClose, onSave }: CardFormProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const [name,          setName]          = useState('');
  const [bank,          setBank]          = useState('');
  const [annualFee,     setAnnualFee]     = useState('');
  const [cashback,      setCashback]      = useState('');
  const [interestRate,  setInterestRate]  = useState('');
  const [benefits,      setBenefits]      = useState<string[]>([]);
  const [customBenefit, setCustomBenefit] = useState('');
  const [colorHex,      setColorHex]      = useState('#1C1C2E');
  const [error,         setError]         = useState('');

  const nameRing = useFocusRing(c);
  const bankRing = useFocusRing(c);
  const feeRing = useFocusRing(c);
  const cashbackRing = useFocusRing(c);
  const rateRing = useFocusRing(c);
  const customBenefitRing = useFocusRing(c);

  const toggleBenefit = (benefit: string) => {
    setBenefits((prev) =>
      prev.includes(benefit)
        ? prev.filter((b) => b !== benefit)
        : [...prev, benefit]
    );
  };

  const addCustomBenefit = () => {
    if (!customBenefit.trim()) return;
    setBenefits((prev) => [...prev, customBenefit.trim()]);
    setCustomBenefit('');
  };

  const handleSave = () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return; }
    if (!bank.trim()) { setError('El banco es obligatorio'); return; }

    const feeNum      = parseFloat(annualFee.replace(/\./g, '').replace(',', '.')) || 0;
    const cashbackNum = parseFloat(cashback.replace(',', '.')) || 0;
    const rateNum     = parseFloat(interestRate.replace(',', '.')) || 0;

    if (rateNum <= 0) { setError('Ingresa la tasa de interés EA (%)'); return; }

    onSave(name.trim(), bank.trim(), feeNum, cashbackNum, rateNum, benefits, colorHex);
    handleClose();
  };

  const handleClose = () => {
    setName(''); setBank(''); setAnnualFee(''); setCashback('');
    setInterestRate(''); setBenefits([]); setCustomBenefit('');
    setColorHex('#1C1C2E'); setError('');
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
          <Text style={styles.headerTitle}>Nueva tarjeta</Text>
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

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nombre de la tarjeta</Text>
            <Animated.View style={[styles.input, nameRing.style]}>
              <TextInput
                style={styles.inputText}
                placeholder="Ej: Mastercard Platinum"
                placeholderTextColor={c.textTertiary}
                value={name}
                onChangeText={(t) => { setName(t); setError(''); }}
                onFocus={nameRing.onFocus}
                onBlur={nameRing.onBlur}
                autoFocus
              />
            </Animated.View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Banco emisor</Text>
            <Animated.View style={[styles.input, bankRing.style]}>
              <TextInput
                style={styles.inputText}
                placeholder="Ej: Bancolombia, Nu, Davivienda"
                placeholderTextColor={c.textTertiary}
                value={bank}
                onChangeText={(t) => { setBank(t); setError(''); }}
                onFocus={bankRing.onFocus}
                onBlur={bankRing.onBlur}
              />
            </Animated.View>
          </View>

          <View style={styles.row3}>
            <View style={styles.col3}>
              <Text style={styles.fieldLabel}>Cuota anual ($)</Text>
              <Animated.View style={[styles.input, feeRing.style]}>
                <TextInput
                  style={styles.inputText}
                  placeholder="0"
                  placeholderTextColor={c.textTertiary}
                  value={annualFee}
                  onChangeText={setAnnualFee}
                  onFocus={feeRing.onFocus}
                  onBlur={feeRing.onBlur}
                  keyboardType="numeric"
                />
              </Animated.View>
            </View>
            <View style={styles.col3}>
              <Text style={styles.fieldLabel}>Cashback (%)</Text>
              <Animated.View style={[styles.input, cashbackRing.style]}>
                <TextInput
                  style={styles.inputText}
                  placeholder="0"
                  placeholderTextColor={c.textTertiary}
                  value={cashback}
                  onChangeText={setCashback}
                  onFocus={cashbackRing.onFocus}
                  onBlur={cashbackRing.onBlur}
                  keyboardType="numeric"
                />
              </Animated.View>
            </View>
            <View style={styles.col3}>
              <Text style={styles.fieldLabel}>Interés EA (%)</Text>
              <Animated.View style={[styles.input, rateRing.style]}>
                <TextInput
                  style={styles.inputText}
                  placeholder="0"
                  placeholderTextColor={c.textTertiary}
                  value={interestRate}
                  onChangeText={(t) => { setInterestRate(t); setError(''); }}
                  onFocus={rateRing.onFocus}
                  onBlur={rateRing.onBlur}
                  keyboardType="numeric"
                />
              </Animated.View>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Beneficios</Text>
            <View style={styles.benefitsGrid}>
              {COMMON_BENEFITS.map((b) => (
                <AnimatedPressable
                  key={b}
                  pressScale={0.96}
                  style={[
                    styles.benefitChip,
                    benefits.includes(b) && styles.benefitChipSelected,
                  ]}
                  onPress={() => toggleBenefit(b)}
                  onPressFeedback={hapticToggle}
                >
                  <Text style={[
                    styles.benefitChipText,
                    benefits.includes(b) && styles.benefitChipTextSelected,
                  ]}>
                    {b}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
            <View style={styles.customBenefitRow}>
              <Animated.View style={[styles.input, { flex: 1 }, customBenefitRing.style]}>
                <TextInput
                  style={styles.inputText}
                  placeholder="Agregar beneficio personalizado"
                  placeholderTextColor={c.textTertiary}
                  value={customBenefit}
                  onChangeText={setCustomBenefit}
                  onSubmitEditing={addCustomBenefit}
                  onFocus={customBenefitRing.onFocus}
                  onBlur={customBenefitRing.onBlur}
                />
              </Animated.View>
              <AnimatedPressable style={styles.addBtn} onPress={addCustomBenefit} onPressFeedback={hapticToggle}>
                <Text style={styles.addBtnText}>+</Text>
              </AnimatedPressable>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Color de la tarjeta</Text>
            <View style={styles.colorGrid}>
              {CARD_COLORS.map((hex) => (
                <AnimatedPressable
                  key={hex}
                  pressScale={0.9}
                  style={[
                    styles.colorDot,
                    { backgroundColor: hex },
                    colorHex === hex && styles.colorDotSelected,
                  ]}
                  onPress={() => setColorHex(hex)}
                  onPressFeedback={hapticToggle}
                />
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
    padding: spacing.md,
    fontSize: 15,
    color: c.textPrimary,
  },
  row3: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  col3: { flex: 1 },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  benefitChip: {
    backgroundColor: c.surface,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  benefitChipSelected: {
    borderColor: c.accent,
    backgroundColor: c.accent + '1A',
  },
  benefitChipText: { fontSize: 12, color: c.textSecondary },
  benefitChipTextSelected: { color: c.accent, fontWeight: '500' },
  customBenefitRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 24, fontWeight: '300' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff' },
});
