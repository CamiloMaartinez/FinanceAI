import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColors, fonts, radius, spacing, type ThemeColors } from '../constants/theme';
import { SUPPORTED_CURRENCIES } from '../constants/currencies';
import { ACCOUNT_COLOR_OPTIONS, suggestAccountIcon } from '../constants/accountStyles';
import { ACCOUNT_ICONS, ICON_SET } from './icons/iconSet';
import { CategoryBadge } from './icons/CategoryBadge';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { Chip } from './ui/Chip';
import { Text } from './ui/Text';
import { hapticSave, hapticToggle } from '../utils/haptics';
import { readableTextOn } from '../utils/color';
import type { Account } from '../models/types';
import type { AccountFormValues } from '../hooks/useAccounts';

interface AccountFormProps {
  visible: boolean;
  /** Cuenta a editar; sin ella el formulario crea una nueva. */
  initial?: Account | null;
  /** Si la cuenta ya tiene movimientos, la moneda no se puede cambiar. */
  hasMovements?: boolean;
  onClose: () => void;
  onSave: (values: AccountFormValues) => Promise<void> | void;
}

const ACCOUNT_TYPES = [
  { value: 'digital',    label: 'Digital' },
  { value: 'checking',   label: 'Corriente' },
  { value: 'savings',    label: 'Ahorros' },
  { value: 'cash',       label: 'Efectivo' },
  { value: 'investment', label: 'Inversión' },
  { value: 'credit',     label: 'Crédito' },
];

function parseAmount(text: string): number {
  // Formato colombiano: punto de miles, coma decimal
  return parseFloat(text.replace(/\./g, '').replace(',', '.'));
}

function formatAmountInput(n: number): string {
  return n.toLocaleString('es-CO', { maximumFractionDigits: 2 });
}

export function AccountForm({ visible, initial, hasMovements = false, onClose, onSave }: AccountFormProps) {
  const c = useColors();
  const s = useMemo(() => createStyles(c), [c]);
  const isEditing = !!initial;

  const [name, setName] = useState('');
  const [type, setType] = useState('digital');
  const [balance, setBalance] = useState('');
  const [colorId, setColorId] = useState(ACCOUNT_COLOR_OPTIONS[1].id);
  const [currency, setCurrency] = useState('COP');
  const [iconName, setIconName] = useState<string>('billetera');
  // Mientras el usuario no elija un ícono a mano, se sugiere según tipo y moneda
  const [iconTouched, setIconTouched] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (initial) {
      setName(initial.name);
      setType(initial.type);
      setBalance(formatAmountInput(initial.balance));
      const match = ACCOUNT_COLOR_OPTIONS.find(
        (o) => o.colorHex.toLowerCase() === initial.colorHex.toLowerCase() && (o.gradientTo ?? null) === (initial.gradientTo ?? null)
      );
      // Un color de antes que ya no está en la paleta se conserva tal cual
      setColorId(match?.id ?? 'custom');
      setCurrency(initial.currency);
      setIconName(initial.iconName);
      setIconTouched(true);
    } else {
      setName('');
      setType('digital');
      setBalance('');
      setColorId(ACCOUNT_COLOR_OPTIONS[1].id);
      setCurrency('COP');
      setIconName(suggestAccountIcon('digital', 'COP'));
      setIconTouched(false);
    }
    setError('');
  }, [visible, initial]);

  useEffect(() => {
    if (!iconTouched) setIconName(suggestAccountIcon(type, currency));
  }, [type, currency, iconTouched]);

  const colorOption = ACCOUNT_COLOR_OPTIONS.find((o) => o.id === colorId);
  const colorHex = colorOption?.colorHex ?? initial?.colorHex ?? ACCOUNT_COLOR_OPTIONS[1].colorHex;
  const gradientTo = colorOption ? colorOption.gradientTo : initial?.gradientTo ?? null;

  const handleSave = async () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    const amount = parseAmount(balance || '0');
    if (isNaN(amount) || (!isEditing && amount < 0)) {
      setError('Ingresa un saldo válido');
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), type, balance: amount, colorHex, gradientTo, iconName, currency });
      hapticSave();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const balanceChanged = isEditing && !isNaN(parseAmount(balance)) && parseAmount(balance) !== initial!.balance;
  const currencyLocked = isEditing && hasMovements;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.header}>
          <AnimatedPressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cancelar">
            <Text style={s.cancel}>Cancelar</Text>
          </AnimatedPressable>
          <Text style={s.headerTitle} accessibilityRole="header">{isEditing ? 'Editar cuenta' : 'Nueva cuenta'}</Text>
          <AnimatedPressable
            onPress={handleSave}
            disabled={saving}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Guardar"
          >
            <Text style={s.save}>Guardar</Text>
          </AnimatedPressable>
        </View>

        <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Vista previa de la tarjeta */}
          <LinearGradient
            colors={[colorHex, gradientTo ?? colorHex]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.preview}
          >
            <CategoryBadge iconName={iconName} colorHex="#FFFFFF" size={44} />
            <Text style={[s.previewName, { color: readableTextOn(colorHex) }]} numberOfLines={1}>
              {name.trim() || 'Nombre de la cuenta'}
            </Text>
          </LinearGradient>

          {!!error && (
            <View style={s.errorBox} accessibilityLiveRegion="polite">
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <Field label="Nombre de la cuenta" s={s}>
            <TextInput
              style={s.input}
              placeholder="Ej: Nequi, Bancolombia…"
              placeholderTextColor={c.textTertiary}
              value={name}
              onChangeText={(t) => { setName(t); setError(''); }}
              autoFocus={!isEditing}
              accessibilityLabel="Nombre de la cuenta"
            />
          </Field>

          <Field label="Moneda" s={s}>
            <View style={s.chips}>
              {SUPPORTED_CURRENCIES.map((cur) => (
                <Chip
                  key={cur.code}
                  label={`${cur.symbol} ${cur.code}`}
                  accessibilityLabel={cur.name}
                  selected={currency === cur.code}
                  onPress={() => { if (!currencyLocked) setCurrency(cur.code); }}
                  style={currencyLocked && currency !== cur.code ? s.disabled : undefined}
                />
              ))}
            </View>
            {currencyLocked ? (
              <Text style={s.hint}>
                La moneda no se puede cambiar porque la cuenta ya tiene movimientos: sus montos quedarían en otra moneda.
              </Text>
            ) : currency !== 'COP' ? (
              <Text style={s.hint}>Se sumará al saldo total en pesos con la tasa de cambio de tu perfil.</Text>
            ) : null}
          </Field>

          <Field label={isEditing ? 'Saldo actual' : 'Saldo inicial'} s={s}>
            <TextInput
              style={s.input}
              placeholder="0"
              placeholderTextColor={c.textTertiary}
              value={balance}
              onChangeText={(t) => { setBalance(t); setError(''); }}
              keyboardType="numeric"
              accessibilityLabel={isEditing ? 'Saldo actual' : 'Saldo inicial'}
            />
            {balanceChanged && (
              <Text style={s.hint}>
                Se registrará un movimiento de “Ajuste de saldo” por la diferencia, para que el historial cuadre.
              </Text>
            )}
          </Field>

          <Field label="Tipo de cuenta" s={s}>
            <View style={s.chips}>
              {ACCOUNT_TYPES.map((t) => (
                <Chip key={t.value} label={t.label} selected={type === t.value} onPress={() => setType(t.value)} />
              ))}
            </View>
          </Field>

          <Field label="Ícono" s={s}>
            <View style={s.iconRow} accessibilityRole="radiogroup">
              {ACCOUNT_ICONS.map((icon) => {
                const selected = iconName === icon;
                return (
                  <AnimatedPressable
                    key={icon}
                    onPress={() => { setIconName(icon); setIconTouched(true); }}
                    onPressFeedback={hapticToggle}
                    pressScale={0.9}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={ICON_SET[icon].label}
                    style={[s.iconCell, selected && s.iconCellSelected]}
                  >
                    <CategoryBadge iconName={icon} colorHex={colorHex} size={44} />
                  </AnimatedPressable>
                );
              })}
            </View>
          </Field>

          <Field label="Color" s={s}>
            <View style={s.colorGrid} accessibilityRole="radiogroup">
              {ACCOUNT_COLOR_OPTIONS.map((o) => {
                const selected = colorId === o.id;
                return (
                  <AnimatedPressable
                    key={o.id}
                    onPress={() => setColorId(o.id)}
                    onPressFeedback={hapticToggle}
                    pressScale={0.9}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={o.label}
                    style={[s.colorCell, selected && s.colorCellSelected]}
                  >
                    <LinearGradient
                      colors={[o.colorHex, o.gradientTo ?? o.colorHex]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={s.colorSwatch}
                    >
                      {selected && <Ionicons name="checkmark" size={16} color={readableTextOn(o.colorHex)} />}
                    </LinearGradient>
                  </AnimatedPressable>
                );
              })}
            </View>
          </Field>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, children, s }: { label: string; children: React.ReactNode; s: ReturnType<typeof createStyles> }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
    },
    headerTitle: { fontFamily: fonts.bold, fontSize: 17, color: c.textPrimary },
    cancel: { fontFamily: fonts.medium, fontSize: 16, color: c.textSecondary },
    save: { fontFamily: fonts.bold, fontSize: 16, color: c.accent },
    form: { paddingHorizontal: spacing.xl, paddingBottom: 60 },
    preview: {
      borderRadius: radius.xl + 4,
      padding: spacing.lg,
      height: 120,
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
      ...c.shadow.md,
    },
    previewName: { fontFamily: fonts.bold, fontSize: 18 },
    errorBox: { backgroundColor: c.expense + '1A', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
    errorText: { fontFamily: fonts.medium, fontSize: 13, color: c.expense },
    field: { marginBottom: spacing.xl },
    fieldLabel: { fontFamily: fonts.semibold, fontSize: 13, color: c.textSecondary, marginBottom: spacing.sm },
    input: {
      fontFamily: fonts.medium,
      fontSize: 16,
      color: c.textPrimary,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    disabled: { opacity: 0.4 },
    hint: { fontFamily: fonts.regular, fontSize: 12, color: c.textSecondary, marginTop: spacing.sm, lineHeight: 17 },
    iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    iconCell: { padding: 3, borderRadius: radius.pill, borderWidth: 2, borderColor: 'transparent' },
    iconCellSelected: { borderColor: c.accent },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    colorCell: { padding: 3, borderRadius: radius.pill, borderWidth: 2, borderColor: 'transparent' },
    colorCellSelected: { borderColor: c.accent },
    colorSwatch: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  });
}
