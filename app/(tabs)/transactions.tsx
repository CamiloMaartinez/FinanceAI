import React, { useState, useMemo } from 'react';
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
import { useTransactions } from '../../src/hooks/useTransactions';
import { TransactionForm } from '../../src/components/TransactionForm';
import { TransactionRow } from '../../src/components/TransactionRow';
import { colors, spacing, radius } from '../../src/constants/theme';
import type { TransactionWithCategory } from '../../src/models/types';

// Agrupa las transacciones por fecha legible: "Hoy", "Ayer", "15 ene"
function groupByDay(transactions: TransactionWithCategory[]) {
  const groups: { label: string; items: TransactionWithCategory[] }[] = [];

  const todayStr     = new Date().toDateString();
  const yesterday     = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr  = yesterday.toDateString();

  transactions.forEach((tx) => {
    const txDate = new Date(tx.date);
    const txDateStr = txDate.toDateString();

    let label: string;
    if (txDateStr === todayStr) {
      label = 'Hoy';
    } else if (txDateStr === yesterdayStr) {
      label = 'Ayer';
    } else {
      label = txDate.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'long',
      });
    }

    const existingGroup = groups.find((g) => g.label === label);
    if (existingGroup) {
      existingGroup.items.push(tx);
    } else {
      groups.push({ label, items: [tx] });
    }
  });

  return groups;
}

export default function TransactionsScreen() {
  const data = useTransactions();
  const [formVisible, setFormVisible] = useState(false);

  const grouped = useMemo(() => groupByDay(data.transactions), [data.transactions]);

  const handleSave = async (
    amount: number,
    type: string,
    date: string,
    accountId: string,
    categoryId: string | null,
    notes: string
  ) => {
    await data.addTransaction(amount, type, date, accountId, categoryId, notes);
  };

  const handleLongPress = (tx: TransactionWithCategory) => {
    Alert.alert(
      'Eliminar movimiento',
      `¿Eliminar "${tx.notes || tx.categoryName || 'este movimiento'}"? El saldo de la cuenta se ajustará.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => data.removeTransaction(tx),
        },
      ]
    );
  };

  if (data.isLoading && data.transactions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.blue} />
      </View>
    );
  }

  const hasNoAccounts = data.accounts.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={data.isLoading}
            onRefresh={data.refresh}
            tintColor={colors.textPrimary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Movimientos</Text>
          <TouchableOpacity
            style={[styles.addButton, hasNoAccounts && styles.addButtonDisabled]}
            onPress={() => {
              if (hasNoAccounts) {
                Alert.alert(
                  'Sin cuentas',
                  'Primero crea una cuenta en la pestaña Cuentas para poder registrar movimientos.'
                );
                return;
              }
              setFormVisible(true);
            }}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {data.error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {data.error}</Text>
          </View>
        )}

        {/* Lista agrupada */}
        {grouped.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Sin movimientos todavía</Text>
            <Text style={styles.emptySubtitle}>
              Registra tu primer ingreso o gasto
            </Text>
          </View>
        ) : (
          grouped.map((group) => (
            <View key={group.label} style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              <View style={styles.groupCard}>
                {group.items.map((tx, i) => (
                  <View key={tx.id}>
                    <TransactionRow transaction={tx} onLongPress={handleLongPress} />
                    {i < group.items.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </View>
            </View>
          ))
        )}

        {grouped.length > 0 && (
          <Text style={styles.hint}>
            💡 Mantén presionado un movimiento para eliminarlo
          </Text>
        )}
      </ScrollView>

      <TransactionForm
        visible={formVisible}
        accounts={data.accounts}
        categories={data.categories}
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: colors.surfaceSecondary,
  },
  errorBox: {
    backgroundColor: 'rgba(255,59,48,0.15)',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 13,
    color: colors.expense,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  group: {
    marginBottom: spacing.lg,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'capitalize',
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.border,
  },
  hint: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});