import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, radius } from '../constants/theme';
import { getExchangeRates, setExchangeRate } from '../services/exchangeRates';

interface ExchangeRatesModalProps {
  visible: boolean;
  onClose: () => void;
}

const EDITABLE_CURRENCIES = [
  { code: 'USD', label: 'Dólar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
];

export function ExchangeRatesModal({ visible, onClose }: ExchangeRatesModalProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const [rates, setRates] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      getExchangeRates().then((r) => {
        setRates({ USD: String(r.USD ?? ''), EUR: String(r.EUR ?? '') });
      });
    }
  }, [visible]);

  const handleSave = async () => {
    for (const cur of EDITABLE_CURRENCIES) {
      const value = parseFloat(rates[cur.code]?.replace(/\./g, '').replace(',', '.') ?? '0');
      if (!isNaN(value) && value > 0) {
        await setExchangeRate(cur.code, value);
      }
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBox}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="swap-horizontal-outline" size={22} color={c.blue} />
          </View>
          <Text style={styles.title}>Tasas de cambio</Text>
          <Text style={styles.subtitle}>
            Estos valores son de referencia — la app no consulta una tasa en tiempo real. Actualízalos manualmente cuando quieras.
          </Text>

          {EDITABLE_CURRENCIES.map((cur) => (
            <View key={cur.code} style={styles.field}>
              <Text style={styles.fieldLabel}>{cur.label} → COP</Text>
              <View style={styles.inputRow}>
                <Text style={styles.inputPrefix}>1 {cur.code} =</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={c.textTertiary}
                  value={rates[cur.code] ?? ''}
                  onChangeText={(t) => setRates((prev) => ({ ...prev, [cur.code]: t }))}
                  keyboardType="numeric"
                />
                <Text style={styles.inputSuffix}>COP</Text>
              </View>
            </View>
          ))}

          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalBox: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 0.5,
    borderColor: c.borderStrong,
  },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,122,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  title: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
  subtitle: { fontSize: 12, color: c.textTertiary, lineHeight: 16.5, marginBottom: spacing.sm },
  field: { gap: spacing.xs },
  fieldLabel: {
    fontSize: 11.5, fontWeight: '500', color: c.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  inputPrefix: { fontSize: 13, color: c.textTertiary },
  input: { flex: 1, fontSize: 15, color: c.textPrimary, paddingVertical: spacing.md },
  inputSuffix: { fontSize: 13, color: c.textTertiary },
  buttonsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radius.md,
    borderWidth: 0.5, borderColor: c.borderStrong, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, color: c.textSecondary },
  saveBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radius.md,
    backgroundColor: c.blue, alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
