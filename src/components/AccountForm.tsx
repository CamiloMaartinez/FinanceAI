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
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, interpolateColor, withSpring } from 'react-native-reanimated';
import { useColors, spacing, radius } from '../constants/theme';
import { springDefault } from '../constants/motion';
import { SUPPORTED_CURRENCIES, getCurrencyInfo } from '../constants/currencies';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { hapticSave, hapticToggle } from '../utils/haptics';

interface AccountFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (
    name: string,
    type: string,
    balance: number,
    colorHex: string,
    iconName: string,
    currency: string
  ) => void;
}

// Tipos de cuenta disponibles
const ACCOUNT_TYPES = [
  { value: 'digital',    label: 'Digital',    icon: 'phone-portrait-outline' },
  { value: 'checking',   label: 'Corriente',  icon: 'business-outline'       },
  { value: 'savings',    label: 'Ahorros',    icon: 'save-outline'           },
  { value: 'cash',       label: 'Efectivo',   icon: 'cash-outline'           },
  { value: 'investment', label: 'Inversión',  icon: 'trending-up-outline'    },
  { value: 'credit',     label: 'Crédito',    icon: 'card-outline'           },
];

// Colores disponibles para la cuenta
const ACCOUNT_COLORS = [
  '#E91E8C', // Rosa Nequi
  '#FDB913', // Amarillo Bancolombia
  '#007AFF', // Azul
  '#34C759', // Verde
  '#FF9500', // Naranja
  '#5856D6', // Púrpura
  '#FF3B30', // Rojo
  '#30B0C7', // Teal
  '#FF2D55', // Rosa
  '#AC8E68', // Café
];

// Anillo de foco animado (§4/§15 apple-design): el borde interpola de
// c.border a c.accent con un resorte crítico, sin desplazar el layout.
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

export function AccountForm({ visible, onClose, onSave }: AccountFormProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const [name,       setName]       = useState('');
  const [type,       setType]       = useState('digital');
  const [balance,    setBalance]    = useState('');
  const [colorHex,   setColorHex]   = useState('#007AFF');
  const [currency,   setCurrency]   = useState('COP');
  const [error,      setError]      = useState('');

  const nameRing = useFocusRing(c);
  const balanceRing = useFocusRing(c);

  const handleSave = () => {
    // Validaciones
    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    const balanceNum = parseFloat(balance.replace(/\./g, '').replace(',', '.'));
    if (isNaN(balanceNum) || balanceNum < 0) {
      setError('Ingresa un saldo válido');
      return;
    }

    onSave(name.trim(), type, balanceNum, colorHex, 'wallet-outline', currency);
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setType('digital');
    setBalance('');
    setColorHex('#007AFF');
    setCurrency('COP');
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
        {/* Header del modal */}
        <View style={styles.header}>
          <AnimatedPressable onPress={handleClose}>
            <Text style={styles.cancelBtn}>Cancelar</Text>
          </AnimatedPressable>
          <Text style={styles.headerTitle}>Nueva cuenta</Text>
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

          {/* Nombre */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nombre de la cuenta</Text>
            <Animated.View style={[styles.input, nameRing.style]}>
              <TextInput
                style={styles.inputText}
                placeholder="Ej: Nequi, Bancolombia..."
                placeholderTextColor={c.textTertiary}
                value={name}
                onChangeText={(text) => { setName(text); setError(''); }}
                onFocus={nameRing.onFocus}
                onBlur={nameRing.onBlur}
                autoFocus
              />
            </Animated.View>
          </View>

          {/* Moneda */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Moneda</Text>
            <View style={styles.typeGrid}>
              {SUPPORTED_CURRENCIES.map((cur) => (
                <AnimatedPressable
                  key={cur.code}
                  pressScale={0.97}
                  style={[
                    styles.typeOption,
                    currency === cur.code && styles.typeOptionSelected,
                  ]}
                  onPress={() => setCurrency(cur.code)}
                  onPressFeedback={hapticToggle}
                >
                  <Text style={[
                    styles.typeLabel,
                    currency === cur.code && styles.typeLabelSelected,
                  ]}>
                    {cur.symbol} {cur.code}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
            {currency !== 'COP' && (
              <Text style={styles.currencyHint}>
                Se sumará al saldo total del dashboard usando la tasa de cambio que configures en tu perfil.
              </Text>
            )}
          </View>

          {/* Saldo inicial */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Saldo inicial</Text>
            <Animated.View style={[styles.input, balanceRing.style]}>
              <TextInput
                style={styles.inputText}
                placeholder="0"
                placeholderTextColor={c.textTertiary}
                value={balance}
                onChangeText={(text) => { setBalance(text); setError(''); }}
                onFocus={balanceRing.onFocus}
                onBlur={balanceRing.onBlur}
                keyboardType="numeric"
              />
            </Animated.View>
          </View>

          {/* Tipo de cuenta */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Tipo de cuenta</Text>
            <View style={styles.typeGrid}>
              {ACCOUNT_TYPES.map((t) => (
                <AnimatedPressable
                  key={t.value}
                  pressScale={0.97}
                  style={[
                    styles.typeOption,
                    type === t.value && styles.typeOptionSelected,
                  ]}
                  onPress={() => setType(t.value)}
                  onPressFeedback={hapticToggle}
                >
                  <Ionicons
                    name={t.icon as any}
                    size={20}
                    color={type === t.value ? c.accent : c.textSecondary}
                  />
                  <Text style={[
                    styles.typeLabel,
                    type === t.value && styles.typeLabelSelected,
                  ]}>
                    {t.label}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>

          {/* Color */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Color</Text>
            <View style={styles.colorGrid}>
              {ACCOUNT_COLORS.map((hex) => (
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
                >
                  {colorHex === hex && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </AnimatedPressable>
              ))}
            </View>
          </View>

          {/* Preview de la tarjeta */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Vista previa</Text>
            <View style={[styles.preview, { borderLeftColor: colorHex }]}>
              <Text style={styles.previewName}>
                {name || 'Nombre de la cuenta'}
              </Text>
              <Text style={styles.previewBalance}>
                {getCurrencyInfo(currency).symbol}{balance || '0'}
              </Text>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex:            1,
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
    fontSize:   17,
    fontWeight: '600',
    color:      c.textPrimary,
  },
  cancelBtn: {
    fontSize: 16,
    color:    c.textSecondary,
  },
  saveBtn: {
    fontSize:   16,
    fontWeight: '600',
    color:      c.accent,
  },
  form: {
    padding: spacing.lg,
  },
  errorBox: {
    backgroundColor: c.expense + '26',
    borderRadius:    radius.md,
    padding:         spacing.md,
    marginBottom:    spacing.md,
  },
  errorText: {
    fontSize: 13,
    color:    c.expense,
  },
  field: {
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize:     13,
    fontWeight:   '500',
    color:        c.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: c.surface,
    borderRadius:    radius.md,
    borderWidth:      1.5,
    borderColor:      c.border,
  },
  inputText: {
    padding:         spacing.lg,
    fontSize:        16,
    color:           c.textPrimary,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.sm,
  },
  typeOption: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing.sm,
    backgroundColor: c.surface,
    borderRadius:   radius.md,
    padding:        spacing.md,
    borderWidth:    1.5,
    borderColor:    'transparent',
  },
  typeOptionSelected: {
    borderColor:     c.accent,
    backgroundColor: c.accent + '1A',
  },
  typeLabel: {
    fontSize: 13,
    color:    c.textSecondary,
  },
  typeLabelSelected: {
    color:      c.accent,
    fontWeight: '500',
  },
  currencyHint: {
    fontSize: 11.5,
    color: c.textTertiary,
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.md,
  },
  colorDot: {
    width:          36,
    height:         36,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  preview: {
    backgroundColor: c.surface,
    borderRadius:    radius.md,
    padding:         spacing.lg,
    borderLeftWidth: 4,
    gap:             spacing.sm,
  },
  previewName: {
    fontSize:   15,
    fontWeight: '600',
    color:      c.textPrimary,
  },
  previewBalance: {
    fontSize:   22,
    fontWeight: '700',
    color:      c.textPrimary,
  },
});
