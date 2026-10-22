import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui/Text';
import { TextInput } from './ui/TextInput';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { useColors, spacing, radius } from '../constants/theme';
import { hapticSave } from '../utils/haptics';
import { formatDate } from '../utils/currency';
import { formatWithCurrency } from '../constants/currencies';
import { parseBankMessage, buildPrefillFromMessage, type BankMessagePrefill } from '../utils/bankMessage';
import type { Account, Category, TransactionWithCategory } from '../models/types';

interface BankMessageModalProps {
  visible: boolean;
  accounts: Account[];
  categories: Category[];
  history: TransactionWithCategory[];
  onClose: () => void;
  /** Abre el formulario del movimiento con estos datos para confirmarlo. */
  onUse: (prefill: BankMessagePrefill) => void;
}

const TYPE_LABEL: Record<BankMessagePrefill['type'], string> = {
  expense: 'Gasto',
  income: 'Ingreso',
  transfer: 'Transferencia entre tus cuentas',
};

// Pegar el SMS, la notificación o el correo del banco: se lee al momento y
// se muestra lo que se entendió antes de abrir el formulario.
export function BankMessageModal({ visible, accounts, categories, history, onClose, onUse }: BankMessageModalProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const [text, setText] = useState('');

  useEffect(() => { if (!visible) setText(''); }, [visible]);

  const parsed = useMemo(() => parseBankMessage(text), [text]);
  const prefill = useMemo(
    () => (parsed ? buildPrefillFromMessage(parsed, accounts, history) : null),
    [parsed, accounts, history]
  );

  const accountName = (id?: string) => accounts.find((a) => a.id === id)?.name;
  const categoryName = categories.find((cat) => cat.id === prefill?.categoryId)?.name;

  // Aviso si ya registraste un movimiento igual ese día (por ejemplo, si el
  // atajo ya lo abrió antes)
  const possibleDuplicate = useMemo(() => {
    if (!prefill) return false;
    const day = new Date(prefill.date ?? Date.now()).toDateString();
    return history.some((t) =>
      t.type === prefill.type && Math.abs(t.amount - prefill.amount) < 0.005 && new Date(t.date).toDateString() === day
    );
  }, [prefill, history]);

  const handleUse = () => {
    if (!prefill) return;
    onUse(prefill);
  };

  const rows: [string, string][] = prefill && parsed ? [
    ['Tipo', TYPE_LABEL[prefill.type]],
    ['Monto', formatWithCurrency(prefill.amount, parsed.currency)],
    ['Nota', prefill.notes],
    ['Cuenta', accountName(prefill.accountId) ?? (parsed.bank ? `${parsed.bank} (elígela en el formulario)` : 'Elígela en el formulario')],
    ...(prefill.toAccountId ? [['Hacia', accountName(prefill.toAccountId) ?? '']] as [string, string][] : []),
    ...(prefill.type === 'expense' ? [['Categoría', categoryName ?? 'La sugiere la IA al abrir']] as [string, string][] : []),
    ['Fecha', prefill.date ? formatDate(prefill.date) : 'Hoy'],
  ] : [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <AnimatedPressable onPress={onClose} accessibilityRole="button">
            <Text style={styles.cancelBtn}>Cancelar</Text>
          </AnimatedPressable>
          <Text style={styles.headerTitle}>Mensaje del banco</Text>
          <AnimatedPressable onPress={handleUse} disabled={!prefill} onPressFeedback={hapticSave} accessibilityRole="button">
            <Text style={[styles.saveBtn, !prefill && styles.disabled]}>Usar</Text>
          </AnimatedPressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            Copia el SMS, la notificación o el correo de tu banco y pégalo aquí. Leemos el monto, el comercio,
            la cuenta y la fecha; tú solo confirmas.
          </Text>

          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Bancolombia: Compraste $45.900 en EXITO con tu T.Deb *1234..."
            placeholderTextColor={c.textTertiary}
            multiline
            autoFocus
            accessibilityLabel="Texto del mensaje del banco"
          />

          {text.trim().length > 0 && !parsed && (
            <View style={styles.notice}>
              <Ionicons name="help-circle-outline" size={18} color={c.orange} />
              <Text style={styles.noticeText}>
                No encontramos un movimiento en este texto. Revisa que tenga el monto con $ y una palabra como
                "compraste", "pagaste", "enviaste" o "recibiste".
              </Text>
            </View>
          )}

          {prefill && (
            <View style={styles.card} accessible accessibilityLabel={rows.map(([k, v]) => `${k}: ${v}`).join('. ')}>
              {rows.map(([label, value]) => (
                <View key={label} style={styles.row}>
                  <Text style={styles.rowLabel}>{label}</Text>
                  <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>
                </View>
              ))}
            </View>
          )}

          {possibleDuplicate && (
            <View style={styles.notice}>
              <Ionicons name="copy-outline" size={18} color={c.orange} />
              <Text style={styles.noticeText}>Ya tienes un movimiento igual ese día. Revisa que no sea el mismo.</Text>
            </View>
          )}

          <Text style={styles.tip}>
            Consejo: pon los últimos 4 dígitos en el nombre de tus cuentas (por ejemplo "Bancolombia *1234") para
            que reconozcamos la cuenta sola. Con un Atajo de iPhone esto pasa automáticamente al llegar el SMS.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.lg, borderBottomWidth: 0.5, borderBottomColor: c.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: c.textPrimary },
  cancelBtn: { fontSize: 16, color: c.textSecondary },
  saveBtn: { fontSize: 16, fontWeight: '600', color: c.accent },
  disabled: { opacity: 0.35 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  intro: { fontSize: 13, color: c.textSecondary, lineHeight: 19 },
  input: {
    minHeight: 120, textAlignVertical: 'top',
    backgroundColor: c.surface, borderRadius: radius.md, padding: spacing.md,
    fontSize: 14, lineHeight: 20, color: c.textPrimary,
  },
  notice: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: c.orange + '1A', borderRadius: radius.md, padding: spacing.md,
  },
  noticeText: { flex: 1, fontSize: 13, color: c.textPrimary, lineHeight: 19 },
  card: { backgroundColor: c.surface, borderRadius: radius.md, paddingHorizontal: spacing.md },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md,
    paddingVertical: spacing.sm + 2, borderBottomWidth: 0.5, borderBottomColor: c.border,
  },
  rowLabel: { fontSize: 13, color: c.textSecondary },
  rowValue: { flex: 1, fontSize: 14, fontWeight: '600', color: c.textPrimary, textAlign: 'right' },
  tip: { fontSize: 12, color: c.textTertiary, lineHeight: 17 },
});
