import React, { useState, useMemo, useEffect } from 'react';
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
import { useColors, spacing, radius } from '../constants/theme';
import type { Subscription } from '../models/types';

interface SubscriptionFormProps {
  visible: boolean;
  editingSubscription?: Subscription | null;
  onClose: () => void;
  onSave: (
    name: string,
    amount: number,
    frequency: string,
    nextBillingDate: string,
    colorHex: string,
    iconName: string
  ) => void;
}

const COMMON_SERVICES = [
  { name: 'Netflix',         icon: 'tv-outline',           color: '#E50914' },
  { name: 'Spotify',         icon: 'musical-notes-outline', color: '#1DB954' },
  { name: 'YouTube Premium', icon: 'logo-youtube',          color: '#FF0000' },
  { name: 'Amazon Prime',    icon: 'cart-outline',          color: '#FF9900' },
  { name: 'Disney+',         icon: 'film-outline',          color: '#113CCF' },
  { name: 'OpenAI',          icon: 'sparkles-outline',      color: '#74AA9C' },
];

const FREQUENCIES = [
  { value: 'weekly',    label: 'Semanal'    },
  { value: 'monthly',   label: 'Mensual'    },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'annual',    label: 'Anual'      },
];

function getDefaultBillingDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 15); // Por defecto, en 15 días
  return date.toISOString();
}

export function SubscriptionForm({ visible, editingSubscription, onClose, onSave }: SubscriptionFormProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const isEditing = !!editingSubscription;
  const [name,       setName]       = useState('');
  const [amount,     setAmount]     = useState('');
  const [frequency,  setFrequency]  = useState('monthly');
  const [colorHex,   setColorHex]   = useState('#BF5AF2');
  const [iconName,   setIconName]   = useState('repeat-outline');
  const [daysAhead,  setDaysAhead]  = useState('15');
  const [error,      setError]      = useState('');

  // Precarga los datos cuando se abre en modo edición
  useEffect(() => {
    if (visible && editingSubscription) {
      setName(editingSubscription.name);
      setAmount(String(Math.round(editingSubscription.amount)));
      setFrequency(editingSubscription.frequency);
      setColorHex(editingSubscription.colorHex);
      setIconName(editingSubscription.iconName);

      const diffMs = new Date(editingSubscription.nextBillingDate).getTime() - Date.now();
      const diffDays = Math.max(Math.round(diffMs / (1000 * 60 * 60 * 24)), 0);
      setDaysAhead(String(diffDays));
      setError('');
    }
  }, [visible, editingSubscription]);

  const handleSelectService = (service: typeof COMMON_SERVICES[0]) => {
    setName(service.name);
    setIconName(service.icon);
    setColorHex(service.color);
    setError('');
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    const amountNum = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Ingresa un monto válido');
      return;
    }
    const days = parseInt(daysAhead, 10);
    if (isNaN(days) || days < 0) {
      setError('Ingresa un número de días válido');
      return;
    }

    const billingDate = new Date();
    billingDate.setDate(billingDate.getDate() + days);

    onSave(name.trim(), amountNum, frequency, billingDate.toISOString(), colorHex, iconName);
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setAmount('');
    setFrequency('monthly');
    setColorHex('#BF5AF2');
    setIconName('repeat-outline');
    setDaysAhead('15');
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
          <Text style={styles.headerTitle}>{isEditing ? 'Editar suscripción' : 'Nueva suscripción'}</Text>
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

          {/* Servicios comunes */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Servicios populares</Text>
            <View style={styles.servicesGrid}>
              {COMMON_SERVICES.map((service) => (
                <TouchableOpacity
                  key={service.name}
                  style={[
                    styles.serviceOption,
                    name === service.name && {
                      backgroundColor: service.color + '20',
                      borderColor: service.color,
                    },
                  ]}
                  onPress={() => handleSelectService(service)}
                >
                  <Ionicons name={service.icon as any} size={20} color={service.color} />
                  <Text style={styles.serviceLabel}>{service.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Nombre */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nombre</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Netflix"
              placeholderTextColor={c.textTertiary}
              value={name}
              onChangeText={(text) => { setName(text); setError(''); }}
            />
          </View>

          {/* Monto */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Monto</Text>
            <View style={styles.amountWrapper}>
              <Text style={styles.amountPrefix}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={c.textTertiary}
                value={amount}
                onChangeText={(text) => { setAmount(text); setError(''); }}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Frecuencia */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Frecuencia de cobro</Text>
            <View style={styles.chipRow}>
              {FREQUENCIES.map((f) => (
                <TouchableOpacity
                  key={f.value}
                  style={[styles.chip, frequency === f.value && styles.chipSelected]}
                  onPress={() => setFrequency(f.value)}
                >
                  <Text style={[styles.chipLabel, frequency === f.value && styles.chipLabelSelected]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Próximo cobro */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Próximo cobro (días desde hoy)</Text>
            <TextInput
              style={styles.input}
              placeholder="15"
              placeholderTextColor={c.textTertiary}
              value={daysAhead}
              onChangeText={(text) => { setDaysAhead(text); setError(''); }}
              keyboardType="numeric"
            />
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
  saveBtn: { fontSize: 16, fontWeight: '600', color: c.blue },
  form: { padding: spacing.lg },
  errorBox: {
    backgroundColor: 'rgba(255,59,48,0.15)',
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
    padding: spacing.lg,
    fontSize: 16,
    color: c.textPrimary,
  },
  amountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: radius.md,
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
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  serviceLabel: { fontSize: 13, color: c.textPrimary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: c.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipSelected: {
    borderColor: c.blue,
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  chipLabel: { fontSize: 13, color: c.textSecondary },
  chipLabelSelected: { color: c.blue, fontWeight: '600' },
});