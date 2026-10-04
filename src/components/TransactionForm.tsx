import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, interpolateColor, withSpring } from 'react-native-reanimated';
import { useColors, spacing, radius } from '../constants/theme';
import { springDefault } from '../constants/motion';
import { ReceiptScannerButton } from './ReceiptScannerButton';
import { suggestCategory } from '../services/ai';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { hapticSave, hapticToggle } from '../utils/haptics';
import { DateField } from './DateField';
import { atLocalNoon, RECURRENCE_LABELS, type RecurrenceFrequency } from '../utils/recurrence';
import type { Account, Category, TransactionInput, TransactionWithCategory } from '../models/types';

type FormType = 'expense' | 'income' | 'transfer';

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

interface TransactionFormProps {
  visible: boolean;
  accounts: Account[];
  categories: Category[];
  editingTransaction?: TransactionWithCategory | null;
  // Datos para precargar un movimiento NUEVO (por ejemplo, desde un atajo
  // de Siri que abre financeai://transactions?monto=...&nota=...)
  prefill?: { amount?: number; notes?: string; type?: 'expense' | 'income' } | null;
  onClose: () => void;
  // `recurrence` solo llega en movimientos nuevos de ingreso o gasto
  onSave: (input: TransactionInput, recurrence: RecurrenceFrequency | null) => void;
}

// Anillo de foco animado (§4/§15 apple-design): interpola el borde entre
// c.border y c.accent con un resorte crítico, sin desplazar el layout.
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

export function TransactionForm({
  visible,
  accounts,
  categories,
  editingTransaction,
  prefill,
  onClose,
  onSave,
}: TransactionFormProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const isEditing = !!editingTransaction;
  const [type,       setType]       = useState<FormType>('expense');
  const [amount,     setAmount]     = useState('');
  const [accountId,  setAccountId]  = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [notes,      setNotes]      = useState('');
  const [date,       setDate]       = useState<Date>(() => new Date());
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency | null>(null);
  const [error,      setError]      = useState('');
  const [categoryFromAI, setCategoryFromAI] = useState(false);
  const [isSuggesting,   setIsSuggesting]   = useState(false);

  const amountRing = useFocusRing(c);
  const notesRing = useFocusRing(c);

  const fromAccount = accounts.find((a) => a.id === accountId);
  // Solo se puede transferir entre cuentas de la misma moneda: el monto
  // que sale es el mismo que entra.
  const transferTargets = accounts.filter(
    (a) => a.id !== accountId && (!fromAccount || a.currency === fromAccount.currency)
  );

  // Selecciona la primera cuenta automáticamente cuando se abre (solo si no estamos editando)
  useEffect(() => {
    if (visible && accounts.length > 0 && !accountId && !editingTransaction) {
      setAccountId(accounts[0].id);
    }
  }, [visible, accounts]);

  // Si la cuenta destino deja de ser válida (misma cuenta u otra moneda), se quita
  useEffect(() => {
    if (toAccountId && !transferTargets.some((a) => a.id === toAccountId)) {
      setToAccountId(null);
    }
  }, [accountId]);

  // Precarga los datos cuando se abre en modo edición
  useEffect(() => {
    if (visible && editingTransaction) {
      const t = editingTransaction.type;
      setType(t === 'income' || t === 'transfer' ? t : 'expense');
      setAmount(String(Math.round(editingTransaction.amount)));
      setAccountId(editingTransaction.accountId);
      setToAccountId(editingTransaction.toAccountId ?? null);
      setCategoryId(editingTransaction.categoryId);
      setNotes(editingTransaction.notes ?? '');
      setDate(new Date(editingTransaction.date));
      setRecurrence(null);
      setError('');
    }
  }, [visible, editingTransaction]);

  // Precarga los datos de un atajo (solo para movimientos nuevos)
  useEffect(() => {
    if (visible && prefill && !editingTransaction) {
      if (prefill.type) setType(prefill.type);
      if (prefill.amount) setAmount(String(Math.round(prefill.amount)));
      if (prefill.notes) setNotes(prefill.notes);
      setError('');
    }
  }, [visible, prefill]);

  // Categorización automática: mientras el usuario escribe la nota de un
  // gasto NUEVO (no al editar), la IA sugiere una categoría tras una pausa
  // de escritura. Si el usuario ya eligió una categoría a mano, no la pisamos.
  useEffect(() => {
    if (editingTransaction || type !== 'expense') return;
    if (categoryId && !categoryFromAI) return; // el usuario ya eligió manualmente
    if (notes.trim().length < 3) return;

    const timeout = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const suggested = await suggestCategory(notes.trim(), categories.map((c) => c.name));
        if (suggested) {
          const match = categories.find((c) => c.name === suggested);
          if (match) {
            setCategoryId(match.id);
            setCategoryFromAI(true);
          }
        }
      } finally {
        setIsSuggesting(false);
      }
    }, 700);

    return () => clearTimeout(timeout);
  }, [notes, type, editingTransaction]);

  const changeType = (next: FormType) => {
    setType(next);
    if (next !== 'expense') setCategoryId(null);
    if (next === 'transfer') setRecurrence(null);
    setError('');
  };

  // Hora que se guarda: si es hoy, la hora actual (así queda arriba en la
  // lista); si se editó sin cambiar el día, la original; si es otro día,
  // mediodía para que la zona horaria no lo mueva de fecha.
  const resolveDateISO = (): string => {
    if (editingTransaction && isSameDay(date, new Date(editingTransaction.date))) {
      return editingTransaction.date;
    }
    if (isSameDay(date, new Date())) return new Date().toISOString();
    return atLocalNoon(date).toISOString();
  };

  const handleSave = () => {
    const amountNum = parseFloat(amount.replace(/\./g, '').replace(',', '.'));

    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Ingresa un monto válido');
      return;
    }
    if (!accountId) {
      setError(type === 'transfer' ? 'Selecciona la cuenta de origen' : 'Selecciona una cuenta');
      return;
    }
    if (type === 'transfer' && !toAccountId) {
      setError('Selecciona la cuenta de destino');
      return;
    }
    if (type === 'expense' && !categoryId) {
      setError('Selecciona una categoría');
      return;
    }

    onSave(
      {
        amount: amountNum,
        type,
        date: resolveDateISO(),
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : null,
        categoryId: type === 'expense' ? categoryId : null,
        notes: notes.trim(),
      },
      !isEditing && type !== 'transfer' ? recurrence : null
    );
    handleClose();
  };

  const handleClose = () => {
    setType('expense');
    setAmount('');
    setAccountId(null);
    setToAccountId(null);
    setCategoryId(null);
    setCategoryFromAI(false);
    setNotes('');
    setDate(new Date());
    setRecurrence(null);
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
        {/* Header */}
        <View style={styles.header}>
          <AnimatedPressable onPress={handleClose}>
            <Text style={styles.cancelBtn}>Cancelar</Text>
          </AnimatedPressable>
          <Text style={styles.headerTitle}>{isEditing ? 'Editar movimiento' : 'Nuevo movimiento'}</Text>
          <AnimatedPressable onPress={handleSave} onPressFeedback={hapticSave}>
            <Text style={styles.saveBtn}>Guardar</Text>
          </AnimatedPressable>
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Selector Ingreso / Gasto */}
          <View style={styles.typeSwitch}>
            <AnimatedPressable
              pressScale={0.98}
              style={[
                styles.typeSwitchOption,
                type === 'expense' && styles.typeSwitchExpenseActive,
              ]}
              onPress={() => changeType('expense')}
              onPressFeedback={hapticToggle}
            >
              <Text style={[
                styles.typeSwitchLabel,
                type === 'expense' && styles.typeSwitchLabelActive,
              ]}>
                Gasto
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              pressScale={0.98}
              style={[
                styles.typeSwitchOption,
                type === 'income' && styles.typeSwitchIncomeActive,
              ]}
              onPress={() => changeType('income')}
              onPressFeedback={hapticToggle}
            >
              <Text style={[
                styles.typeSwitchLabel,
                type === 'income' && styles.typeSwitchLabelActive,
              ]}>
                Ingreso
              </Text>
            </AnimatedPressable>
            {/* Transferir requiere al menos dos cuentas */}
            {accounts.length > 1 && (
              <AnimatedPressable
                pressScale={0.98}
                style={[
                  styles.typeSwitchOption,
                  type === 'transfer' && styles.typeSwitchTransferActive,
                ]}
                onPress={() => changeType('transfer')}
                onPressFeedback={hapticToggle}
              >
                <Text style={[
                  styles.typeSwitchLabel,
                  type === 'transfer' && styles.typeSwitchLabelActive,
                ]}>
                  Transferencia
                </Text>
              </AnimatedPressable>
            )}
          </View>

          {/* Escanear recibo — solo para gastos nuevos, no al editar */}
          {type === 'expense' && !isEditing && (
            <View style={styles.field}>
              <ReceiptScannerButton
                onScanned={(amount, notes) => {
                  if (amount !== null) {
                    setAmount(String(Math.round(amount)));
                  }
                  if (notes) {
                    setNotes(notes);
                  }
                  setError('');
                }}
              />
            </View>
          )}

          {/* Monto */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Monto</Text>
            <Animated.View style={[styles.amountWrapper, amountRing.style]}>
              <Text style={styles.amountPrefix}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={c.textTertiary}
                value={amount}
                onChangeText={(text) => { setAmount(text); setError(''); }}
                onFocus={amountRing.onFocus}
                onBlur={amountRing.onBlur}
                keyboardType="numeric"
                autoFocus
              />
            </Animated.View>
          </View>

          {/* Fecha */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Fecha</Text>
            <DateField value={date} onChange={setDate} />
          </View>

          {/* Cuenta (o cuenta de origen, en transferencias) */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{type === 'transfer' ? 'Desde' : 'Cuenta'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {accounts.map((acc) => (
                  <AnimatedPressable
                    key={acc.id}
                    pressScale={0.97}
                    style={[
                      styles.chip,
                      accountId === acc.id && {
                        backgroundColor: acc.colorHex + '25',
                        borderColor: acc.colorHex,
                      },
                    ]}
                    onPress={() => { setAccountId(acc.id); setError(''); }}
                    onPressFeedback={hapticToggle}
                  >
                    <View style={[styles.chipDot, { backgroundColor: acc.colorHex }]} />
                    <Text style={styles.chipLabel}>{acc.name}</Text>
                  </AnimatedPressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Cuenta destino — solo transferencias */}
          {type === 'transfer' && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Hacia</Text>
              {transferTargets.length === 0 ? (
                <Text style={styles.helperText}>
                  No tienes otra cuenta en {fromAccount?.currency ?? 'esta moneda'}.
                  Solo se puede transferir entre cuentas de la misma moneda.
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {transferTargets.map((acc) => (
                      <AnimatedPressable
                        key={acc.id}
                        pressScale={0.97}
                        style={[
                          styles.chip,
                          toAccountId === acc.id && {
                            backgroundColor: acc.colorHex + '25',
                            borderColor: acc.colorHex,
                          },
                        ]}
                        onPress={() => { setToAccountId(acc.id); setError(''); }}
                        onPressFeedback={hapticToggle}
                      >
                        <View style={[styles.chipDot, { backgroundColor: acc.colorHex }]} />
                        <Text style={styles.chipLabel}>{acc.name}</Text>
                      </AnimatedPressable>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          )}

          {/* Categoría — solo para gastos */}
          {type === 'expense' && (
            <View style={styles.field}>
              <View style={styles.categoryLabelRow}>
                <Text style={styles.fieldLabel}>Categoría</Text>
                {isSuggesting && (
                  <View style={styles.aiHint}>
                    <ActivityIndicator size="small" color={c.textTertiary} />
                    <Text style={styles.aiHintText}>Pensando...</Text>
                  </View>
                )}
                {!isSuggesting && categoryFromAI && categoryId && (
                  <View style={styles.aiHint}>
                    <Ionicons name="sparkles" size={12} color={c.accent} />
                    <Text style={[styles.aiHintText, { color: c.accent }]}>Sugerido por IA</Text>
                  </View>
                )}
              </View>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                  <AnimatedPressable
                    key={cat.id}
                    pressScale={0.97}
                    style={[
                      styles.categoryOption,
                      categoryId === cat.id && {
                        backgroundColor: cat.colorHex + '20',
                        borderColor: cat.colorHex,
                      },
                    ]}
                    onPress={() => { setCategoryId(cat.id); setCategoryFromAI(false); setError(''); }}
                    onPressFeedback={hapticToggle}
                  >
                    <Ionicons
                      name={cat.iconName as any}
                      size={18}
                      color={categoryId === cat.id ? cat.colorHex : c.textSecondary}
                    />
                    <Text style={[
                      styles.categoryLabel,
                      categoryId === cat.id && { color: cat.colorHex, fontWeight: '600' },
                    ]}>
                      {cat.name}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>
            </View>
          )}

          {/* Repetir — solo ingresos y gastos nuevos (salario, arriendo...) */}
          {!isEditing && type !== 'transfer' && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Repetir</Text>
              <View style={styles.chipRow}>
                {([null, 'weekly', 'biweekly', 'monthly'] as const).map((freq) => {
                  const active = recurrence === freq;
                  return (
                    <AnimatedPressable
                      key={freq ?? 'none'}
                      pressScale={0.97}
                      style={[styles.chip, active && styles.chipSelected]}
                      onPress={() => setRecurrence(freq)}
                      onPressFeedback={hapticToggle}
                    >
                      <Text style={[styles.chipLabel, active && styles.chipLabelSelected]}>
                        {freq ? RECURRENCE_LABELS[freq] : 'No'}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
              {recurrence && (
                <Text style={styles.helperText}>
                  Se registrará solo cada {recurrence === 'monthly' ? 'mes' : recurrence === 'biweekly' ? '15 días' : 'semana'} al abrir la app.
                  Puedes detenerlo en Movimientos → Recurrentes.
                </Text>
              )}
            </View>
          )}

          {/* Nota */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nota (opcional)</Text>
            <Animated.View style={[styles.input, notesRing.style]}>
              <TextInput
                style={styles.inputText}
                placeholder="Ej: Almuerzo con amigos"
                placeholderTextColor={c.textTertiary}
                value={notes}
                onChangeText={setNotes}
                onFocus={notesRing.onFocus}
                onBlur={notesRing.onBlur}
              />
            </Animated.View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    padding:        spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: c.textPrimary,
  },
  cancelBtn: {
    fontSize: 16,
    color: c.textSecondary,
  },
  saveBtn: {
    fontSize: 16,
    fontWeight: '600',
    color: c.accent,
  },
  form: {
    padding: spacing.lg,
  },
  errorBox: {
    backgroundColor: c.expense + '26',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 13,
    color: c.expense,
  },
  typeSwitch: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.xl,
  },
  typeSwitchOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  typeSwitchExpenseActive: {
    backgroundColor: c.expense + '33',
  },
  typeSwitchIncomeActive: {
    backgroundColor: c.income + '33',
  },
  typeSwitchTransferActive: {
    backgroundColor: c.blue + '33',
  },
  helperText: {
    fontSize: 12,
    color: c.textTertiary,
    marginTop: spacing.sm,
    lineHeight: 17,
  },
  chipSelected: {
    borderColor: c.accent,
    backgroundColor: c.accent + '1F',
  },
  chipLabelSelected: {
    fontWeight: '600',
  },
  typeSwitchLabel: {
    fontSize: 14,
    color: c.textSecondary,
  },
  typeSwitchLabelActive: {
    color: c.textPrimary,
    fontWeight: '600',
  },
  field: {
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  aiHintText: {
    fontSize: 11,
    color: c.textTertiary,
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
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chipLabel: {
    fontSize: 13,
    color: c.textPrimary,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  categoryLabel: {
    fontSize: 13,
    color: c.textSecondary,
  },
});
