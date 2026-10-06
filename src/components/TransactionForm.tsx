import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Modal, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Text } from './ui/Text';
import { TextInput } from './ui/TextInput';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, interpolateColor, withSpring } from 'react-native-reanimated';
import { useColors, spacing, radius, pastels } from '../constants/theme';
import { springDefault } from '../constants/motion';
import { ReceiptScannerButton } from './ReceiptScannerButton';
import { suggestCategory } from '../services/ai';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { AppIcon } from './icons/AppIcon';
import { badgeColors } from './icons/CategoryBadge';
import { hapticSave, hapticToggle } from '../utils/haptics';
import { DateField } from './DateField';
import { ReceiptAttachment } from './ReceiptAttachment';
import { saveReceiptPhoto, resolveReceiptUri, deleteReceiptPhoto } from '../services/receiptStorage';
import { atLocalNoon, RECURRENCE_LABELS, type RecurrenceFrequency } from '../utils/recurrence';
import { splitAmount } from '../utils/splitExpense';
import { parseShortcutAmount } from '../utils/shortcutParams';
import { getExchangeRates, convertBetween } from '../services/exchangeRates';
import { formatCurrency } from '../utils/currency';
import { formatAmountForInput } from '../utils/amountInput';
import { formatWithCurrency } from '../constants/currencies';
import { AmountEntrySheet } from './AmountEntrySheet';
import { AmountText } from './ui/AmountText';
import { Chip } from './ui/Chip';
import type { Account, Category, TransactionInput, TransactionType, TransactionWithCategory } from '../models/types';

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
  prefill?: { amount?: number; notes?: string; type?: FormType; accountId?: string } | null;
  onClose: () => void;
  // `recurrence` solo llega en movimientos nuevos de ingreso o gasto
  // splitWith: personas con quienes se divide un gasto nuevo (null = no se divide)
  onSave: (input: TransactionInput, recurrence: RecurrenceFrequency | null, splitWith: string[] | null) => void;
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
  // Movimientos antiguos de tipo préstamo, pago o inversión: el formulario
  // los muestra como ingreso o gasto, pero conservan su tipo si no se cambia
  const [legacyType, setLegacyType] = useState<TransactionType | null>(null);
  const [amount,     setAmount]     = useState('');
  const [accountId,  setAccountId]  = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [notes,      setNotes]      = useState('');
  const [date,       setDate]       = useState<Date>(() => new Date());
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency | null>(null);
  // Dividir un gasto nuevo con otras personas (crea deudas "me deben")
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitPeople, setSplitPeople] = useState<string[]>([]);
  const [splitName, setSplitName] = useState('');
  // Recibo: receiptPath = el ya guardado (ruta relativa); pendingPhotoUri =
  // una foto nueva que se copia a la carpeta de la app solo al guardar
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const receiptDisplayUri = useMemo(
    () => pendingPhotoUri ?? resolveReceiptUri(receiptPath),
    [pendingPhotoUri, receiptPath]
  );
  const [error,      setError]      = useState('');
  const [categoryFromAI, setCategoryFromAI] = useState(false);
  const [isSuggesting,   setIsSuggesting]   = useState(false);

  // Pantalla de monto (teclado propio + deslizar para confirmar)
  const [amountSheetOpen, setAmountSheetOpen] = useState(false);
  const notesRing = useFocusRing(c);

  const fromAccount = accounts.find((a) => a.id === accountId);
  const amountValue = (() => {
    const n = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  })();
  const transferTargets = accounts.filter((a) => a.id !== accountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);
  // Entre monedas distintas: sale `amount` en la moneda de origen y llega
  // `receivedAmount` en la de destino (calculado con la tasa del día, editable)
  const isCrossCurrency = !!fromAccount && !!toAccount && fromAccount.currency !== toAccount.currency;
  const [rates, setRates] = useState<Record<string, number>>({});
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receivedEdited, setReceivedEdited] = useState(false);

  useEffect(() => {
    if (visible) getExchangeRates().then(setRates).catch(() => {});
  }, [visible]);

  // Recalcula lo que se recibe mientras el usuario no lo haya corregido a mano
  useEffect(() => {
    if (!isCrossCurrency || receivedEdited || !fromAccount || !toAccount) return;
    const sent = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
    if (!(sent > 0)) { setReceivedAmount(''); return; }
    const value = convertBetween(sent, fromAccount.currency, toAccount.currency, rates);
    setReceivedAmount(value.toLocaleString('es-CO', { maximumFractionDigits: 2 }));
  }, [amount, accountId, toAccountId, rates, isCrossCurrency, receivedEdited]);

  // "1 USD = $3.311,64 COP" para la moneda extranjera de la transferencia
  const rateLabel = (() => {
    if (!isCrossCurrency || !fromAccount || !toAccount) return '';
    const foreign = fromAccount.currency !== 'COP' ? fromAccount.currency : toAccount.currency;
    const rate = rates[foreign];
    return rate ? `1 ${foreign} = $${rate.toLocaleString('es-CO', { maximumFractionDigits: 2 })} COP` : '';
  })();

  // Selecciona la primera cuenta automáticamente cuando se abre (solo si no estamos editando)
  useEffect(() => {
    if (visible && accounts.length > 0 && !accountId && !editingTransaction) {
      setAccountId(accounts[0].id);
    }
  }, [visible, accounts]);

  // Si la cuenta destino pasa a ser la misma de origen, se quita
  useEffect(() => {
    if (toAccountId && !transferTargets.some((a) => a.id === toAccountId)) {
      setToAccountId(null);
    }
  }, [accountId]);

  // Precarga los datos cuando se abre en modo edición
  useEffect(() => {
    if (visible && editingTransaction) {
      const t = editingTransaction.type;
      setType(t === 'income' || t === 'transfer' ? t : t === 'loan' ? 'income' : 'expense');
      setLegacyType(t === 'loan' || t === 'payment' || t === 'investment' ? t : null);
      setAmount(String(Math.round(editingTransaction.amount)));
      setAccountId(editingTransaction.accountId);
      setToAccountId(editingTransaction.toAccountId ?? null);
      if (editingTransaction.toAmount != null) {
        setReceivedAmount(editingTransaction.toAmount.toLocaleString('es-CO', { maximumFractionDigits: 2 }));
        setReceivedEdited(true); // respeta el valor que se guardó
      }
      setCategoryId(editingTransaction.categoryId);
      setNotes(editingTransaction.notes ?? '');
      setReceiptPath(editingTransaction.receiptUri ?? null);
      setPendingPhotoUri(null);
      setDate(new Date(editingTransaction.date));
      setRecurrence(null);
      setError('');
    }
  }, [visible, editingTransaction]);

  // Precarga los datos de un atajo (solo para movimientos nuevos)
  useEffect(() => {
    if (visible && prefill && !editingTransaction) {
      if (prefill.type) setType(prefill.type);
      if (prefill.accountId && accounts.some((a) => a.id === prefill.accountId)) setAccountId(prefill.accountId);
      if (prefill.amount) setAmount(String(Math.round(prefill.amount)));
      if (prefill.notes) setNotes(prefill.notes);
      setError('');
    }
  }, [visible, prefill]);

  useEffect(() => {
    if (!visible || editingTransaction || prefill?.amount) return;
    // Pequeña espera: iOS no presenta un modal mientras el anterior aún está entrando
    const t = setTimeout(() => setAmountSheetOpen(true), 350);
    return () => clearTimeout(t);
  }, [visible]);

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
    setLegacyType(null); // el usuario eligió un tipo: ya no es el antiguo
    if (next !== 'expense') setCategoryId(null);
    if (next === 'transfer') setRecurrence(null);
    if (next !== 'expense') { setIsSplitting(false); setSplitPeople([]); }
    setError('');
  };

  const addSplitPerson = () => {
    const name = splitName.trim();
    if (!name) return;
    if (!splitPeople.some((p) => p.toLowerCase() === name.toLowerCase())) {
      setSplitPeople((prev) => [...prev, name]);
    }
    setSplitName('');
  };
  const splitting = !isEditing && type === 'expense' && isSplitting && splitPeople.length > 0;

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
    const received = isCrossCurrency ? parseShortcutAmount(receivedAmount) : null;
    if (type === 'transfer' && isCrossCurrency && !received) {
      setError(`Ingresa cuánto llega a ${toAccount?.name ?? 'la cuenta destino'}`);
      return;
    }
    // Un pago o una inversión antiguos pueden no tener categoría: se guardan igual
    if (type === 'expense' && !categoryId && !legacyType) {
      setError('Selecciona una categoría');
      return;
    }

    // Foto del recibo: una nueva se copia a la carpeta permanente; la que se
    // reemplazó o se quitó se borra para no dejar archivos huérfanos
    let finalReceipt = type === 'transfer' ? null : receiptPath;
    if (pendingPhotoUri && type !== 'transfer') {
      try {
        finalReceipt = saveReceiptPhoto(pendingPhotoUri);
      } catch {
        setError('No se pudo guardar la foto del recibo');
        return;
      }
    }
    const previousReceipt = editingTransaction?.receiptUri ?? null;
    if (previousReceipt && previousReceipt !== finalReceipt) deleteReceiptPhoto(previousReceipt);

    onSave(
      {
        amount: amountNum,
        type: legacyType ?? type,
        date: resolveDateISO(),
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : null,
        toAmount: type === 'transfer' && isCrossCurrency ? received : null,
        categoryId: type === 'expense' || legacyType ? categoryId : null,
        notes: notes.trim(),
        receiptUri: finalReceipt,
      },
      !isEditing && type !== 'transfer' && !splitting ? recurrence : null,
      splitting ? splitPeople : null
    );
    handleClose();
  };

  const handleClose = () => {
    setAmountSheetOpen(false);
    setType('expense');
    setLegacyType(null);
    setAmount('');
    setAccountId(null);
    setToAccountId(null);
    setCategoryId(null);
    setCategoryFromAI(false);
    setNotes('');
    setDate(new Date());
    setRecurrence(null);
    setIsSplitting(false);
    setSplitPeople([]);
    setSplitName('');
    setReceivedAmount('');
    setReceivedEdited(false);
    setReceiptPath(null);
    setPendingPhotoUri(null);
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
                onScanned={(amount, notes, photoUri) => {
                  if (amount !== null) {
                    setAmount(String(Math.round(amount)));
                  }
                  if (notes) {
                    setNotes(notes);
                  }
                  setPendingPhotoUri(photoUri); // la foto escaneada queda adjunta
                  setError('');
                }}
              />
            </View>
          )}

          {/* Monto */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Monto</Text>
            <AnimatedPressable
              style={styles.amountWrapper}
              onPress={() => setAmountSheetOpen(true)}
              onPressFeedback={hapticToggle}
              pressScale={0.98}
              accessibilityRole="button"
              accessibilityLabel={amountValue > 0 ? `Monto: ${formatWithCurrency(amountValue, fromAccount?.currency ?? 'COP')}. Toca para cambiarlo` : 'Escribir el monto'}
            >
              {amountValue > 0 ? (
                <AmountText value={amountValue} currency={fromAccount?.currency ?? 'COP'} size={30} />
              ) : (
                <Text style={styles.amountPlaceholder}>Toca para escribir el monto</Text>
              )}
              <Ionicons name="keypad-outline" size={20} color={c.textTertiary} />
            </AnimatedPressable>
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
                        onPress={() => { setToAccountId(acc.id); setReceivedEdited(false); setError(''); }}
                        onPressFeedback={hapticToggle}
                      >
                        <View style={[styles.chipDot, { backgroundColor: acc.colorHex }]} />
                        <Text style={styles.chipLabel}>
                          {acc.name}{fromAccount && acc.currency !== fromAccount.currency ? ` (${acc.currency})` : ''}
                        </Text>
                      </AnimatedPressable>
                    ))}
                  </View>
              </ScrollView>
            </View>
          )}

          {/* Entre monedas distintas: cuánto llega a la cuenta destino */}
          {type === 'transfer' && isCrossCurrency && fromAccount && toAccount && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Recibes en {toAccount.name}</Text>
              <View style={[styles.input, styles.receivedRow]}>
                <TextInput
                  style={[styles.inputText, styles.receivedInput]}
                  placeholder="0"
                  placeholderTextColor={c.textTertiary}
                  value={receivedAmount}
                  onChangeText={(t) => { setReceivedAmount(t); setReceivedEdited(true); setError(''); }}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.receivedCurrency}>{toAccount.currency}</Text>
              </View>
              <Text style={styles.helperText}>
                Calculado con la tasa del día
                {rateLabel ? ` (${rateLabel})` : ''}. Corrígelo si tu banco o casa de cambio te dio otro valor.
              </Text>
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
                        backgroundColor: badgeColors(cat.colorHex).bg,
                        borderColor: badgeColors(cat.colorHex).fg,
                      },
                    ]}
                    onPress={() => { setCategoryId(cat.id); setCategoryFromAI(false); setError(''); }}
                    onPressFeedback={hapticToggle}
                  >
                    <AppIcon
                      name={cat.iconName}
                      size={20}
                      color={categoryId === cat.id ? badgeColors(cat.colorHex).fg : c.textSecondary}
                    />
                    <Text style={[
                      styles.categoryLabel,
                      categoryId === cat.id && { color: badgeColors(cat.colorHex).fg, fontWeight: '600' },
                    ]}>
                      {cat.name}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>
            </View>
          )}

          {/* Dividir — solo gastos nuevos: tu parte es el gasto, los demás te deben */}
          {!isEditing && type === 'expense' && (
            <View style={styles.field}>
              <View style={styles.categoryLabelRow}>
                <Text style={styles.fieldLabel}>Dividir gasto</Text>
                <AnimatedPressable
                  onPress={() => { setIsSplitting((v) => !v); setRecurrence(null); }}
                  onPressFeedback={hapticToggle}
                  hitSlop={8}
                >
                  <Text style={styles.linkText}>{isSplitting ? 'No dividir' : 'Dividir con otros'}</Text>
                </AnimatedPressable>
              </View>
              {isSplitting && (
                <>
                  <View style={styles.splitInputRow}>
                    <TextInput
                      style={[styles.input, styles.inputText, styles.splitInput]}
                      placeholder="Nombre de la persona"
                      placeholderTextColor={c.textTertiary}
                      value={splitName}
                      onChangeText={setSplitName}
                      onSubmitEditing={addSplitPerson}
                      returnKeyType="done"
                    />
                    <AnimatedPressable style={styles.splitAddButton} onPress={addSplitPerson} onPressFeedback={hapticToggle}>
                      <Ionicons name="add" size={20} color={c.accent} />
                    </AnimatedPressable>
                  </View>
                  <View style={[styles.chipRow, styles.chipWrap]}>
                    {splitPeople.map((name) => (
                      <AnimatedPressable
                        key={name}
                        style={[styles.chip, styles.chipSelected]}
                        onPress={() => setSplitPeople((prev) => prev.filter((p) => p !== name))}
                        onPressFeedback={hapticToggle}
                        accessibilityLabel={`Quitar a ${name}`}
                      >
                        <Text style={styles.chipLabel}>{name}</Text>
                        <Ionicons name="close" size={14} color={c.textSecondary} />
                      </AnimatedPressable>
                    ))}
                  </View>
                  {splitPeople.length > 0 && (() => {
                    const total = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
                    if (!(total > 0)) return <Text style={styles.helperText}>Escribe el monto para ver cuánto le toca a cada uno.</Text>;
                    const { myShare, otherShare } = splitAmount(total, splitPeople.length + 1);
                    return (
                      <Text style={styles.helperText}>
                        Entre {splitPeople.length + 1} personas: tu gasto es {formatCurrency(myShare)} y cada persona te debe {formatCurrency(otherShare)}.
                        Las deudas quedan en Más → Deudas y préstamos.
                      </Text>
                    );
                  })()}
                </>
              )}
            </View>
          )}

          {/* Repetir — solo ingresos y gastos nuevos (salario, arriendo...) */}
          {!isEditing && type !== 'transfer' && !isSplitting && (
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

          {/* Foto del recibo — no aplica a transferencias */}
          {type !== 'transfer' && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Recibo (opcional)</Text>
              <ReceiptAttachment
                uri={receiptDisplayUri}
                onPick={(uri) => setPendingPhotoUri(uri)}
                onRemove={() => { setPendingPhotoUri(null); setReceiptPath(null); }}
              />
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
      <AmountEntrySheet
        visible={amountSheetOpen}
        title={isEditing ? 'Editar monto' : type === 'income' ? 'Nuevo ingreso' : type === 'transfer' ? 'Transferencia' : 'Nuevo gasto'}
        subtitle={fromAccount ? (type === 'transfer' && toAccount ? `${fromAccount.name} → ${toAccount.name}` : fromAccount.name) : undefined}
        currency={fromAccount?.currency ?? 'COP'}
        initialValue={amountValue}
        available={type === 'income' ? null : fromAccount?.balance ?? null}
        equivalence={(value) => {
          if (!fromAccount) return null;
          if (type === 'transfer' && toAccount && isCrossCurrency) {
            return `Llegan ≈ ${formatWithCurrency(convertBetween(value, fromAccount.currency, toAccount.currency, rates), toAccount.currency)}`;
          }
          if (fromAccount.currency !== 'COP' && rates[fromAccount.currency]) {
            return `≈ ${formatWithCurrency(convertBetween(value, fromAccount.currency, 'COP', rates), 'COP')}`;
          }
          return null;
        }}
        headerColor={type === 'income' ? pastels.mint : type === 'transfer' ? pastels.sky : pastels.pink}
        onConfirm={(value) => {
          setAmount(formatAmountForInput(value));
          setError('');
          setAmountSheetOpen(false);
        }}
        onClose={() => setAmountSheetOpen(false)}
      >
        {accounts.length > 1 && (
          <View style={styles.sheetAccounts}>
            {accounts.map((acc) => (
              <Chip
                key={acc.id}
                label={acc.name}
                selected={accountId === acc.id}
                onPress={() => { setAccountId(acc.id); setError(''); }}
              />
            ))}
          </View>
        )}
      </AmountEntrySheet>
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
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.accent,
    marginBottom: spacing.sm,
  },
  splitInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  splitInput: {
    flex: 1,
    paddingVertical: spacing.md,
  },
  receivedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.lg,
  },
  receivedInput: {
    flex: 1,
  },
  receivedCurrency: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textSecondary,
  },
  splitAddButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: c.accent + '1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipWrap: {
    flexWrap: 'wrap',
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
  sheetAccounts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  amountPlaceholder: { flex: 1, fontSize: 16, color: c.textTertiary },
  amountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: c.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 64,
    gap: spacing.md,
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
