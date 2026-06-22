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
import { colors, spacing, radius } from '../constants/theme';

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

export function CardForm({ visible, onClose, onSave }: CardFormProps) {
  const [name,          setName]          = useState('');
  const [bank,          setBank]          = useState('');
  const [annualFee,     setAnnualFee]     = useState('');
  const [cashback,      setCashback]      = useState('');
  const [interestRate,  setInterestRate]  = useState('');
  const [benefits,      setBenefits]      = useState<string[]>([]);
  const [customBenefit, setCustomBenefit] = useState('');
  const [colorHex,      setColorHex]      = useState('#1C1C2E');
  const [error,         setError]         = useState('');

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
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelBtn}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nueva tarjeta</Text>
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

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nombre de la tarjeta</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Mastercard Platinum"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={(t) => { setName(t); setError(''); }}
              autoFocus
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Banco emisor</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Bancolombia, Nu, Davivienda"
              placeholderTextColor={colors.textTertiary}
              value={bank}
              onChangeText={(t) => { setBank(t); setError(''); }}
            />
          </View>

          <View style={styles.row3}>
            <View style={styles.col3}>
              <Text style={styles.fieldLabel}>Cuota anual ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                value={annualFee}
                onChangeText={setAnnualFee}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.col3}>
              <Text style={styles.fieldLabel}>Cashback (%)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                value={cashback}
                onChangeText={setCashback}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.col3}>
              <Text style={styles.fieldLabel}>Interés EA (%)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                value={interestRate}
                onChangeText={(t) => { setInterestRate(t); setError(''); }}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Beneficios</Text>
            <View style={styles.benefitsGrid}>
              {COMMON_BENEFITS.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[
                    styles.benefitChip,
                    benefits.includes(b) && styles.benefitChipSelected,
                  ]}
                  onPress={() => toggleBenefit(b)}
                >
                  <Text style={[
                    styles.benefitChipText,
                    benefits.includes(b) && styles.benefitChipTextSelected,
                  ]}>
                    {b}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.customBenefitRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Agregar beneficio personalizado"
                placeholderTextColor={colors.textTertiary}
                value={customBenefit}
                onChangeText={setCustomBenefit}
                onSubmitEditing={addCustomBenefit}
              />
              <TouchableOpacity style={styles.addBtn} onPress={addCustomBenefit}>
                <Text style={styles.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Color de la tarjeta</Text>
            <View style={styles.colorGrid}>
              {CARD_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    colorHex === c && styles.colorDotSelected,
                  ]}
                  onPress={() => setColorHex(c)}
                />
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
    padding: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
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
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  benefitChipSelected: {
    borderColor: colors.blue,
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  benefitChipText: { fontSize: 12, color: colors.textSecondary },
  benefitChipTextSelected: { color: colors.blue, fontWeight: '500' },
  customBenefitRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.blue,
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