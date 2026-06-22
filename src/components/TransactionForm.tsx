import React, { useState, useEffect } from 'react';
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
import { ReceiptScannerButton } from './ReceiptScannerButton';
import type { Account, Category } from '../models/types';

interface TransactionFormProps {
  visible: boolean;
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
  onSave: (
    amount: number,
    type: string,
    date: string,
    accountId: string,
    categoryId: string | null,
    notes: string
  ) => void;
}

export function TransactionForm({
  visible,
  accounts,
  categories,
  onClose,
  onSave,
}: TransactionFormProps) {
  const [type,       setType]       = useState<'expense' | 'income'>('expense');
  const [amount,     setAmount]     = useState('');
  const [accountId,  setAccountId]  = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [notes,      setNotes]      = useState('');
  const [error,      setError]      = useState('');

  // Selecciona la primera cuenta automáticamente cuando se abre
  useEffect(() => {
    if (visible && accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [visible, accounts]);

  const handleSave = () => {
    const amountNum = parseFloat(amount.replace(/\./g, '').replace(',', '.'));

    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Ingresa un monto válido');
      return;
    }
    if (!accountId) {
      setError('Selecciona una cuenta');
      return;
    }
    if (type === 'expense' && !categoryId) {
      setError('Selecciona una categoría');
      return;
    }

    onSave(
      amountNum,
      type,
      new Date().toISOString(),
      accountId,
      type === 'expense' ? categoryId : null,
      notes.trim()
    );
    handleClose();
  };

  const handleClose = () => {
    setType('expense');
    setAmount('');
    setAccountId(null);
    setCategoryId(null);
    setNotes('');
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
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelBtn}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nuevo movimiento</Text>
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

          {/* Selector Ingreso / Gasto */}
          <View style={styles.typeSwitch}>
            <TouchableOpacity
              style={[
                styles.typeSwitchOption,
                type === 'expense' && styles.typeSwitchExpenseActive,
              ]}
              onPress={() => { setType('expense'); setError(''); }}
            >
              <Text style={[
                styles.typeSwitchLabel,
                type === 'expense' && styles.typeSwitchLabelActive,
              ]}>
                Gasto
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeSwitchOption,
                type === 'income' && styles.typeSwitchIncomeActive,
              ]}
              onPress={() => { setType('income'); setCategoryId(null); setError(''); }}
            >
              <Text style={[
                styles.typeSwitchLabel,
                type === 'income' && styles.typeSwitchLabelActive,
              ]}>
                Ingreso
              </Text>
            </TouchableOpacity>
          </View>

          {/* Escanear recibo — solo para gastos */}
          {type === 'expense' && (
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
            <View style={styles.amountWrapper}>
              <Text style={styles.amountPrefix}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                value={amount}
                onChangeText={(text) => { setAmount(text); setError(''); }}
                keyboardType="numeric"
                autoFocus
              />
            </View>
          </View>

          {/* Cuenta */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Cuenta</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {accounts.map((acc) => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      styles.chip,
                      accountId === acc.id && {
                        backgroundColor: acc.colorHex + '25',
                        borderColor: acc.colorHex,
                      },
                    ]}
                    onPress={() => { setAccountId(acc.id); setError(''); }}
                  >
                    <View style={[styles.chipDot, { backgroundColor: acc.colorHex }]} />
                    <Text style={styles.chipLabel}>{acc.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Categoría — solo para gastos */}
          {type === 'expense' && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Categoría</Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryOption,
                      categoryId === cat.id && {
                        backgroundColor: cat.colorHex + '20',
                        borderColor: cat.colorHex,
                      },
                    ]}
                    onPress={() => { setCategoryId(cat.id); setError(''); }}
                  >
                    <Ionicons
                      name={cat.iconName as any}
                      size={18}
                      color={categoryId === cat.id ? cat.colorHex : colors.textSecondary}
                    />
                    <Text style={[
                      styles.categoryLabel,
                      categoryId === cat.id && { color: cat.colorHex, fontWeight: '600' },
                    ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Nota */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nota (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Almuerzo con amigos"
              placeholderTextColor={colors.textTertiary}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cancelBtn: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  saveBtn: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.blue,
  },
  form: {
    padding: spacing.lg,
  },
  errorBox: {
    backgroundColor: 'rgba(255,59,48,0.15)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 13,
    color: colors.expense,
  },
  typeSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
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
    backgroundColor: 'rgba(255,59,48,0.2)',
  },
  typeSwitchIncomeActive: {
    backgroundColor: 'rgba(52,199,89,0.2)',
  },
  typeSwitchLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  typeSwitchLabelActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  field: {
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  amountPrefix: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingVertical: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    fontSize: 16,
    color: colors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
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
    color: colors.textPrimary,
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
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  categoryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});