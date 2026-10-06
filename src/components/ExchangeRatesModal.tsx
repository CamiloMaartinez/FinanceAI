import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Switch, Linking, ActivityIndicator } from 'react-native';
import { Text } from './ui/Text';
import { TextInput } from './ui/TextInput';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, radius } from '../constants/theme';
import {
  getExchangeRates,
  getExchangeRatesMeta,
  setExchangeRate,
  setAutoExchangeRates,
  refreshExchangeRates,
  RATES_ATTRIBUTION_URL,
  type ExchangeRatesMeta,
} from '../services/exchangeRates';
import { Sheet } from './ui/Sheet';
import { Button } from './ui/Button';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { hapticToggle } from '../utils/haptics';

interface ExchangeRatesModalProps {
  visible: boolean;
  onClose: () => void;
}

const EDITABLE_CURRENCIES = [
  { code: 'USD', label: 'Dólar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
];

// Tasas con dos decimales y coma decimal: 3311.6443 → "3311,64"
function formatRate(value: number | undefined): string {
  if (!value) return '';
  return (Math.round(value * 100) / 100).toString().replace('.', ',');
}

function describeUpdatedAt(iso: string | null): string {
  if (!iso) return 'Todavía no se han descargado';
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  return sameDay
    ? `Actualizadas hoy a las ${time}`
    : `Actualizadas el ${date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`;
}

export function ExchangeRatesModal({ visible, onClose }: ExchangeRatesModalProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const [rates, setRates] = useState<Record<string, string>>({});
  const [meta, setMeta] = useState<ExchangeRatesMeta>({ auto: true, updatedAt: null });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');

  const load = async () => {
    const [r, m] = await Promise.all([getExchangeRates(), getExchangeRatesMeta()]);
    setRates({ USD: formatRate(r.USD), EUR: formatRate(r.EUR) });
    setMeta(m);
  };

  useEffect(() => {
    if (visible) {
      setRefreshError('');
      load();
    }
  }, [visible]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshError('');
    const result = await refreshExchangeRates({ force: true });
    if (result === 'failed') setRefreshError('No se pudo conectar. Se mantienen las últimas tasas.');
    await load();
    setIsRefreshing(false);
  };

  const handleToggleAuto = async (auto: boolean) => {
    await setAutoExchangeRates(auto);
    setMeta((prev) => ({ ...prev, auto }));
    if (auto) await handleRefresh();
  };

  const handleSave = async () => {
    // En modo automático no hay nada que guardar: las tasas vienen de internet
    if (!meta.auto) {
      for (const cur of EDITABLE_CURRENCIES) {
        const value = parseFloat(rates[cur.code]?.replace(/\./g, '').replace(',', '.') ?? '0');
        if (!isNaN(value) && value > 0) {
          await setExchangeRate(cur.code, value);
        }
      }
    }
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="swap-horizontal-outline" size={22} color={c.accent} />
        </View>
        <Text style={styles.title}>Tasas de cambio</Text>

        <View style={styles.autoRow}>
          <View style={styles.autoText}>
            <Text style={styles.autoLabel}>Actualizar automáticamente</Text>
            <Text style={styles.subtitle}>
              {meta.auto
                ? 'Se descarga la tasa del día al abrir la app.'
                : 'Usas tus propias tasas; la app no las cambia.'}
            </Text>
          </View>
          <Switch
            value={meta.auto}
            onValueChange={handleToggleAuto}
            trackColor={{ true: c.accent, false: c.border }}
          />
        </View>

        {EDITABLE_CURRENCIES.map((cur) => (
          <View key={cur.code} style={styles.field}>
            <Text style={styles.fieldLabel}>{cur.label} → COP</Text>
            <View style={[styles.inputRow, meta.auto && styles.inputRowReadOnly]}>
              <Text style={styles.inputPrefix}>1 {cur.code} =</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={c.textTertiary}
                value={rates[cur.code] ?? ''}
                onChangeText={(t) => setRates((prev) => ({ ...prev, [cur.code]: t }))}
                keyboardType="decimal-pad"
                editable={!meta.auto}
              />
              <Text style={styles.inputSuffix}>COP</Text>
            </View>
          </View>
        ))}

        {meta.auto && (
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>{refreshError || describeUpdatedAt(meta.updatedAt)}</Text>
            {isRefreshing ? (
              <ActivityIndicator size="small" color={c.textTertiary} />
            ) : (
              <AnimatedPressable onPress={handleRefresh} onPressFeedback={hapticToggle} hitSlop={8}>
                <Text style={styles.refreshLink}>Actualizar ahora</Text>
              </AnimatedPressable>
            )}
          </View>
        )}

        {/* Atribución que exigen las condiciones de uso de la fuente */}
        <AnimatedPressable onPress={() => Linking.openURL(RATES_ATTRIBUTION_URL)} hitSlop={6}>
          <Text style={styles.attribution}>Rates By Exchange Rate API</Text>
        </AnimatedPressable>

        <View style={styles.buttonsRow}>
          <Button label="Cancelar" variant="secondary" onPress={onClose} haptic={null} style={styles.flexBtn} />
          <Button label={meta.auto ? 'Listo' : 'Guardar'} variant="primary" onPress={handleSave} style={styles.flexBtn} />
        </View>
      </KeyboardAvoidingView>
    </Sheet>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  content: {
    padding: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: c.accent + '20',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  title: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
  subtitle: { fontSize: 12, color: c.textTertiary, lineHeight: 16.5 },
  autoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  autoText: { flex: 1, gap: 2 },
  autoLabel: { fontSize: 14, fontWeight: '500', color: c.textPrimary },
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
  inputRowReadOnly: { opacity: 0.7 },
  inputPrefix: { fontSize: 13, color: c.textTertiary },
  input: { flex: 1, fontSize: 15, color: c.textPrimary, paddingVertical: spacing.md },
  inputSuffix: { fontSize: 13, color: c.textTertiary },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  statusText: { flex: 1, fontSize: 12, color: c.textTertiary },
  refreshLink: { fontSize: 13, fontWeight: '600', color: c.accent },
  attribution: { fontSize: 11, color: c.textTertiary, textDecorationLine: 'underline' },
  buttonsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  flexBtn: { flex: 1 },
});
