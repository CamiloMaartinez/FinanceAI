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
import { colors, spacing, radius } from '../../src/constants/theme';
import { formatCurrency } from '../../src/utils/currency';
import type { Account } from '../../src/models/types';

export default function AccountsScreen() {
  const accounts = useAccounts();
  const [formVisible, setFormVisible] = useState(false);

  const handleSave = async (
    name: string,
    type: string,
    balance: number,
    colorHex: string,
    iconName: string
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
              `¿Eliminar la cuenta "${account.name}"? Esta acción no se puede deshacer.`,
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Eliminar',
                  style: 'destructive',
                  onPress: () => accounts.removeAccount(account.id),
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handlePress = (account: Account) => {
    // En un módulo futuro: navegar al detalle de la cuenta
    Alert.alert(account.name, `Saldo: ${formatCurrency(account.balance)}`);
  };

  if (accounts.isLoading && accounts.accounts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.blue} />
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
            tintColor={colors.textPrimary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Mis Cuentas</Text>
            <Text style={styles.subtitle}>
              {accounts.accounts.length} cuenta{accounts.accounts.length !== 1 ? 's' : ''} · {formatCurrency(accounts.totalBalance)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setFormVisible(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Error */}
        {accounts.error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {accounts.error}</Text>
          </View>
        )}

        {/* Lista de cuentas */}
        {accounts.accounts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Sin cuentas todavía</Text>
            <Text style={styles.emptySubtitle}>
              Agrega tu primera cuenta para empezar a registrar tus finanzas
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setFormVisible(true)}
            >
              <Text style={styles.emptyButtonText}>Crear cuenta</Text>
            </TouchableOpacity>
          </View>
        ) : (
          accounts.accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onPress={handlePress}
              onLongPress={handleLongPress}
            />
          ))
        )}

        {/* Tip de uso */}
        {accounts.accounts.length > 0 && (
          <Text style={styles.hint}>
            💡 Mantén presionada una cuenta para editarla o eliminarla
          </Text>
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
    flex:            1,
    backgroundColor: colors.background,
    alignItems:      'center',
    justifyContent:  'center',
  },
  container: {
    flex:            1,
    backgroundColor: colors.background,
  },
  content: {
    padding:       spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   spacing.xl,
  },
  title: {
    fontSize:   28,
    fontWeight: '700',
    color:      colors.textPrimary,
  },
  subtitle: {
    fontSize:  13,
    color:     colors.textSecondary,
    marginTop: 4,
  },
  addButton: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: colors.blue,
    alignItems:      'center',
    justifyContent:  'center',
  },
  errorBox: {
    backgroundColor: 'rgba(255,59,48,0.15)',
    borderRadius:    8,
    padding:         spacing.md,
    marginBottom:    spacing.md,
  },
  errorText: {
    fontSize: 13,
    color:    colors.expense,
  },
  empty: {
    alignItems:      'center',
    paddingVertical: spacing.xxl * 2,
    gap:              spacing.sm,
  },
  emptyTitle: {
    fontSize:   16,
    fontWeight: '600',
    color:      colors.textPrimary,
    marginTop:  spacing.md,
  },
  emptySubtitle: {
    fontSize:   13,
    color:      colors.textTertiary,
    textAlign:  'center',
    paddingHorizontal: spacing.xl,
  },
  emptyButton: {
    backgroundColor: colors.blue,
    borderRadius:    radius.md,
    paddingVertical:   spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  emptyButtonText: {
    color:      '#fff',
    fontWeight: '600',
    fontSize:   14,
  },
  hint: {
    fontSize:  12,
    color:     colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});