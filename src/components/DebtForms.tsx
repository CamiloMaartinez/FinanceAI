import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useColors, spacing, radius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { DateField } from './DateField';
import { hapticSave, hapticToggle } from '../utils/haptics';
import { formatCurrency } from '../utils/currency';
import { atLocalNoon } from '../utils/recurrence';
import type { Account, Debt, DebtDirection } from '../models/types';
import type { DebtInput } from '../database/db';

// "25.000" o "25000,5" → número
function parseAmount(text: string): number {
  return parseFloat(text.replace(/\./g, '').replace(',', '.'));
}

// Fecha del movimiento: si es hoy, la hora actual; si no, mediodía
function toStoredDate(date: Date): string {
  return date.toDateString() === new Date().toDateString()
    ? new Date().toISOString()
    : atLocalNoon(date).toISOString();
}

function useFormStyles() {
  const c = useColors();
  return { c, styles: useMemo(() => createStyles(c), [c]) };
}

function Header({ title, onCancel, onSave, saveLabel }: {
  title: string; onCancel: () => void; onSave: () => void; saveLabel: string;
}) {
  const { styles } = useFormStyles();
  return (
    <View style={styles.header}>
      <AnimatedPressable onPress={onCancel}>
        <Text style={styles.cancelBtn}>Cancelar</Text>
      </AnimatedPressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <AnimatedPressable onPress={onSave} onPressFeedback={hapticSave}>
        <Text style={styles.saveBtn}>{saveLabel}</Text>
      </AnimatedPressable>
    </View>
  );
}

// Cuenta de donde sale o a donde entra el dinero; "No mover dinero" solo
// registra la deuda sin tocar ningún saldo
function AccountPicker({ accounts, value, onChange }: {
  accounts: Account[]; value: string | null; onChange: (id: string | null) => void;
}) {
  const { styles } = useFormStyles();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.chipRow}>
        <AnimatedPressable
          style={[styles.chip, value === null && styles.chipSelected]}
          onPress={() => onChange(null)}
          onPressFeedback={hapticToggle}
        >
          <Text style={styles.chipLabel}>No mover dinero</Text>
        </AnimatedPressable>
        {accounts.map((acc) => (
          <AnimatedPressable
            key={acc.id}
            style={[styles.chip, value === acc.id && { borderColor: acc.colorHex, backgroundColor: acc.colorHex + '25' }]}
            onPress={() => onChange(acc.id)}
            onPressFeedback={hapticToggle}
          >
            <View style={[styles.chipDot, { backgroundColor: acc.colorHex }]} />
            <Text style={styles.chipLabel}>{acc.name}</Text>
          </AnimatedPressable>
        ))}
      </View>
    </ScrollView>
  );
}

// Fecha límite: opcional y siempre en el futuro
function DueDatePicker({ value, onChange }: { value: Date | null; onChange: (d: Date | null) => void }) {
  const { c, styles } = useFormStyles();
  const { isDark } = useTheme();
  const today = new Date();
  const inDays = (n: number) => atLocalNoon(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n));

  const quick = [
    { label: 'Sin fecha', date: null },
    { label: 'En 1 semana', date: inDays(7) },
    { label: 'En 1 mes', date: inDays(30) },
  ];
  const isQuick = (d: Date | null) => quick.some((q) => (q.date?.toDateString() ?? null) === (d?.toDateString() ?? null));

  return (
    <View style={styles.chipRowWrap}>
      {quick.map((q) => (
        <AnimatedPressable
          key={q.label}
          style={[styles.chip, (q.date?.toDateString() ?? null) === (value?.toDateString() ?? null) && styles.chipSelected]}
          onPress={() => onChange(q.date)}
          onPressFeedback={hapticToggle}
        >
          <Text style={styles.chipLabel}>{q.label}</Text>
        </AnimatedPressable>
      ))}
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value ?? inDays(14)}
          mode="date"
          display="compact"
          minimumDate={today}
          locale="es-CO"
          themeVariant={isDark ? 'dark' : 'light'}
          accentColor={c.accent}
          onValueChange={(_e, d) => onChange(atLocalNoon(d))}
        />
      ) : (
        <AnimatedPressable
          style={[styles.chip, value && !isQuick(value) && styles.chipSelected]}
          onPress={() => DateTimePickerAndroid.open({
            value: value ?? inDays(14), mode: 'date', minimumDate: today,
            onValueChange: (_e, d) => onChange(atLocalNoon(d)),
          })}
          onPressFeedback={hapticToggle}
        >
          <Text style={styles.chipLabel}>
            {value && !isQuick(value) ? value.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : 'Otra fecha'}
          </Text>
        </AnimatedPressable>
      )}
    </View>
  );
}

export function DebtForm({ visible, accounts, onClose, onSave }: {
  visible: boolean;
  accounts: Account[];
  onClose: () => void;
  onSave: (input: DebtInput) => void;
}) {
  const { c, styles } = useFormStyles();
  const [direction, setDirection] = useState<DebtDirection>('owed_to_me');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setDirection('owed_to_me'); setPersonName(''); setAmount(''); setDate(new Date());
    setDueDate(null); setAccountId(null); setNotes(''); setError('');
  };
  const handleClose = () => { reset(); onClose(); };

  const handleSave = () => {
    const value = parseAmount(amount);
    if (!personName.trim()) return setError('Escribe el nombre de la persona');
    if (!(value > 0)) return setError('Ingresa un monto válido');
    onSave({
      direction, personName: personName.trim(), amount: value, notes: notes.trim(),
      date: toStoredDate(date), dueDate: dueDate ? dueDate.toISOString() : null, accountId,
    });
    handleClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Header title="Nueva deuda" onCancel={handleClose} onSave={handleSave} saveLabel="Guardar" />
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

          <View style={styles.segment}>
            {([['owed_to_me', 'Me deben'], ['i_owe', 'Debo']] as const).map(([value, label]) => (
              <AnimatedPressable
                key={value}
                pressScale={0.98}
                style={[styles.segmentOption, direction === value && styles.segmentActive]}
                onPress={() => setDirection(value)}
                onPressFeedback={hapticToggle}
              >
                <Text style={[styles.segmentLabel, direction === value && styles.segmentLabelActive]}>{label}</Text>
              </AnimatedPressable>
            ))}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{direction === 'owed_to_me' ? '¿Quién te debe?' : '¿A quién le debes?'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre"
              placeholderTextColor={c.textTertiary}
              value={personName}
              onChangeText={(t) => { setPersonName(t); setError(''); }}
              autoFocus
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Monto</Text>
            <TextInput
              style={[styles.input, styles.amountInput]}
              placeholder="0"
              placeholderTextColor={c.textTertiary}
              value={amount}
              onChangeText={(t) => { setAmount(t); setError(''); }}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Fecha del préstamo</Text>
            <DateField value={date} onChange={setDate} />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Fecha límite de pago</Text>
            <DueDatePicker value={dueDate} onChange={setDueDate} />
            {dueDate && <Text style={styles.helperText}>Te avisaremos el día antes y el mismo día.</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{direction === 'owed_to_me' ? '¿De qué cuenta salió?' : '¿A qué cuenta entró?'}</Text>
            <AccountPicker accounts={accounts} value={accountId} onChange={setAccountId} />
            <Text style={styles.helperText}>
              No cuenta como gasto ni como ingreso: solo mueve el saldo de la cuenta.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nota (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Para el arreglo del carro"
              placeholderTextColor={c.textTertiary}
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function DebtPaymentForm({ debt, accounts, onClose, onSave }: {
  debt: Debt | null;
  accounts: Account[];
  onClose: () => void;
  onSave: (amount: number, date: string, accountId: string | null) => Promise<void>;
}) {
  const { c, styles } = useFormStyles();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [accountId, setAccountId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Al abrir: por defecto, la misma cuenta que se usó al prestar
  useEffect(() => {
    if (debt) {
      setAmount(''); setDate(new Date()); setAccountId(debt.accountId); setError('');
    }
  }, [debt]);

  if (!debt) return null;

  const handleSave = async () => {
    const value = parseAmount(amount);
    if (!(value > 0)) return setError('Ingresa un monto válido');
    if (value > debt.remaining + 0.005) return setError(`El abono no puede superar lo pendiente (${formatCurrency(debt.remaining)})`);
    try {
      await onSave(value, toStoredDate(date), accountId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el abono');
    }
  };

  const owedToMe = debt.direction === 'owed_to_me';

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Header title="Registrar abono" onCancel={onClose} onSave={handleSave} saveLabel="Guardar" />
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

          <Text style={styles.summary}>
            {owedToMe ? `${debt.personName} te debe ` : `Le debes a ${debt.personName} `}
            <Text style={styles.summaryStrong}>{formatCurrency(debt.remaining)}</Text>
          </Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{owedToMe ? '¿Cuánto te pagó?' : '¿Cuánto pagaste?'}</Text>
            <TextInput
              style={[styles.input, styles.amountInput]}
              placeholder="0"
              placeholderTextColor={c.textTertiary}
              value={amount}
              onChangeText={(t) => { setAmount(t); setError(''); }}
              keyboardType="numeric"
              autoFocus
            />
            <AnimatedPressable
              style={[styles.chip, styles.payAll]}
              onPress={() => setAmount(String(Math.round(debt.remaining * 100) / 100))}
              onPressFeedback={hapticToggle}
            >
              <Text style={styles.chipLabel}>Todo lo pendiente</Text>
            </AnimatedPressable>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Fecha</Text>
            <DateField value={date} onChange={setDate} />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{owedToMe ? '¿A qué cuenta entró?' : '¿De qué cuenta salió?'}</Text>
            <AccountPicker accounts={accounts} value={accountId} onChange={setAccountId} />
          </View>
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
  form: { padding: spacing.lg },
  errorBox: { backgroundColor: c.expense + '26', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText: { fontSize: 13, color: c.expense },
  segment: { flexDirection: 'row', backgroundColor: c.surface, borderRadius: radius.md, padding: 4, marginBottom: spacing.xl },
  segmentOption: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  segmentActive: { backgroundColor: c.accent + '2E' },
  segmentLabel: { fontSize: 14, color: c.textSecondary },
  segmentLabelActive: { color: c.textPrimary, fontWeight: '600' },
  field: { marginBottom: spacing.xl },
  fieldLabel: {
    fontSize: 13, fontWeight: '500', color: c.textSecondary, marginBottom: spacing.sm,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1.5, borderColor: c.border,
    padding: spacing.lg, fontSize: 16, color: c.textPrimary,
  },
  amountInput: { fontSize: 24, fontWeight: '700' },
  helperText: { fontSize: 12, color: c.textTertiary, marginTop: spacing.sm, lineHeight: 17 },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: c.surface, borderRadius: radius.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  chipSelected: { borderColor: c.accent, backgroundColor: c.accent + '1F' },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipLabel: { fontSize: 13, color: c.textPrimary },
  payAll: { alignSelf: 'flex-start', marginTop: spacing.sm },
  summary: { fontSize: 15, color: c.textSecondary, marginBottom: spacing.xl },
  summaryStrong: { fontWeight: '700', color: c.textPrimary },
});
