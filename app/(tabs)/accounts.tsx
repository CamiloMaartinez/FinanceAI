import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAccounts } from '../../src/hooks/useAccounts';
import { AccountCard } from '../../src/components/AccountCard';
import { AccountForm } from '../../src/components/AccountForm';
import { colors, spacing, typography } from '../../src/constants/theme';
import { formatCurrency } from '../../src/utils/currency';
import type { Account } from '../../src/models/types';

export default function AccountsScreen() {
  const accounts = useAccounts();
  const [formVisible, setFormVisible] = useState(false);

  const handleSave = async (
    name: string, type: string, balance: number,
    colorHex: string, iconName: string
  ) => {
    await accounts.addAccount(name, type, balance, colorHex, iconName);
  };

  const handleLongPress = (account: Account) => {
    Alert.alert(
      account.name,
      '¿Qué deseas hacer con esta cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmar',
              `¿Eliminar "${account.name}"?`,
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: () => accounts.removeAccount(account.id) },
              ]
            );
          },
        },
      ]
    );
  };

  const handlePress = (account: Account) => {
    Alert.alert(account.name, formatCurrency(account.balance));
  };

  if (accounts.isLoading && accounts.accounts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.textTertiary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={accounts.isLoading}
            onRefresh={accounts.refresh}
            tintColor={colors.textTertiary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.label}>CUENTAS</Text>
            <Text style={styles.totalBalance}>
              {formatCurrency(accounts.totalBalance)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setFormVisible(true)}
          >
            <Ionicons name="add" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {accounts.error && (
          <Text style={styles.errorText}>⚠️ {accounts.error}</Text>
        )}

        {accounts.accounts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Sin cuentas</Text>
            <Text style={styles.emptySubtitle}>
              Agrega tu primera cuenta financiera
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setFormVisible(true)}
            >
              <Text style={styles.emptyButtonText}>+ Nueva cuenta</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {accounts.accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onPress={handlePress}
                onLongPress={handleLongPress}
              />
            ))}
            <Text style={styles.hint}>
              Mantén presionada una cuenta para eliminarla
            </Text>
          </>
        )}
      </ScrollView>

      <AccountForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: spacing.lg,
  },
  label: {
    ...typography.label,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  totalBalance: {
    fontSize: 28,
    fontWeight: '200',
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.xl,
  },
  errorText: { fontSize: 12, color: colors.expense, marginBottom: spacing.md },
  empty: {
    paddingVertical: spacing.xxl * 2,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '300',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '300',
    color: colors.textTertiary,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderWidth: 0.5,
    borderColor: colors.borderStrong,
    borderRadius: 6,
  },
  emptyButtonText: {
    fontSize: 13,
    fontWeight: '300',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  hint: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xl,
    letterSpacing: 0.3,
  },
});