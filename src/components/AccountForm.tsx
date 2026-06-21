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
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../constants/theme';

interface AccountFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (
    name: string,
    type: string,
    balance: number,
    colorHex: string,
    iconName: string
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

export function AccountForm({ visible, onClose, onSave }: AccountFormProps) {
  const [name,       setName]       = useState('');
  const [type,       setType]       = useState('digital');
  const [balance,    setBalance]    = useState('');
  const [colorHex,   setColorHex]   = useState('#007AFF');
  const [error,      setError]      = useState('');

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

    onSave(name.trim(), type, balanceNum, colorHex, 'wallet-outline');
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setType('digital');
    setBalance('');
    setColorHex('#007AFF');
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
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelBtn}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nueva cuenta</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveBtn}>Guardar</Text>
          </TouchableOpacity>
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
            <TextInput
              style={styles.input}
              placeholder="Ej: Nequi, Bancolombia..."
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={(text) => { setName(text); setError(''); }}
              autoFocus
            />
          </View>

          {/* Saldo inicial */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Saldo inicial</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              value={balance}
              onChangeText={(text) => { setBalance(text); setError(''); }}
              keyboardType="numeric"
            />
          </View>

          {/* Tipo de cuenta */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Tipo de cuenta</Text>
            <View style={styles.typeGrid}>
              {ACCOUNT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[
                    styles.typeOption,
                    type === t.value && styles.typeOptionSelected,
                  ]}
                  onPress={() => setType(t.value)}
                >
                  <Ionicons
                    name={t.icon as any}
                    size={20}
                    color={type === t.value ? colors.blue : colors.textSecondary}
                  />
                  <Text style={[
                    styles.typeLabel,
                    type === t.value && styles.typeLabelSelected,
                  ]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Color */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Color</Text>
            <View style={styles.colorGrid}>
              {ACCOUNT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    colorHex === c && styles.colorDotSelected,
                  ]}
                  onPress={() => setColorHex(c)}
                >
                  {colorHex === c && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
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
                ${balance || '0'}
              </Text>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    padding:        spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize:   17,
    fontWeight: '600',
    color:      colors.textPrimary,
  },
  cancelBtn: {
    fontSize: 16,
    color:    colors.textSecondary,
  },
  saveBtn: {
    fontSize:   16,
    fontWeight: '600',
    color:      colors.blue,
  },
  form: {
    padding: spacing.lg,
  },
  errorBox: {
    backgroundColor: 'rgba(255,59,48,0.15)',
    borderRadius:    radius.md,
    padding:         spacing.md,
    marginBottom:    spacing.md,
  },
  errorText: {
    fontSize: 13,
    color:    colors.expense,
  },
  field: {
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize:     13,
    fontWeight:   '500',
    color:        colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius:    radius.md,
    padding:         spacing.lg,
    fontSize:        16,
    color:           colors.textPrimary,
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
    backgroundColor: colors.surface,
    borderRadius:   radius.md,
    padding:        spacing.md,
    borderWidth:    1.5,
    borderColor:    'transparent',
  },
  typeOptionSelected: {
    borderColor:     colors.blue,
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  typeLabel: {
    fontSize: 13,
    color:    colors.textSecondary,
  },
  typeLabelSelected: {
    color:      colors.blue,
    fontWeight: '500',
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
    backgroundColor: colors.surface,
    borderRadius:    radius.md,
    padding:         spacing.lg,
    borderLeftWidth: 4,
    gap:             spacing.sm,
  },
  previewName: {
    fontSize:   15,
    fontWeight: '600',
    color:      colors.textPrimary,
  },
  previewBalance: {
    fontSize:   22,
    fontWeight: '700',
    color:      colors.textPrimary,
  },
});