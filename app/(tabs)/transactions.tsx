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
import { colors, spacing, typography } from '../../src/constants/theme';
import type { TransactionWithCategory } from '../../src/models/types';

function groupByDay(transactions: TransactionWithCategory[]) {
  const groups: { label: string; items: TransactionWithCategory[] }[] = [];
  const todayStr     = new Date().toDateString();
  const yesterday    = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  transactions.forEach((tx) => {
    const txDate    = new Date(tx.date);
    const txDateStr = txDate.toDateString();
    let label: string;

    if (txDateStr === todayStr) {
      label = 'Hoy';
    } else if (txDateStr === yesterdayStr) {
      label = 'Ayer';
    } else {
      label = txDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
    }

    const existing = groups.find((g) => g.label === label);
    if (existing) existing.items.push(tx);
    else groups.push({ label, items: [tx] });
  });

  return groups;
}

export default function TransactionsScreen() {
  const data = useTransactions();
  const [formVisible, setFormVisible] = useState(false);
  const grouped = useMemo(() => groupByDay(data.transactions), [data.transactions]);

  const handleSave = async (
    amount: number, type: string, date: string,
    accountId: string, categoryId: string | null, notes: string
  ) => {
    await data.addTransaction(amount, type, date, accountId, categoryId, notes);
  };

  const handleLongPress = (tx: TransactionWithCategory) => {
    Alert.alert(
      'Eliminar movimiento',
      `¿Eliminar "${tx.notes || tx.categoryName || 'este movimiento'}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => data.removeTransaction(tx) },
      ]
    );
  };

  if (data.isLoading && data.transactions.length === 0) {
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
            refreshing={data.isLoading}
            onRefresh={data.refresh}
            tintColor={colors.textTertiary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.label}>MOVIMIENTOS</Text>
            <Text style={styles.count}>
              {data.transactions.length} registros
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.addButton,
              data.accounts.length === 0 && styles.addButtonDisabled,
            ]}
            onPress={() => {
              if (data.accounts.length === 0) {
                Alert.alert('Sin cuentas', 'Crea una cuenta primero.');
                return;
              }
              setFormVisible(true);
            }}
          >
            <Ionicons name="add" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {data.error && (
          <Text style={styles.errorText}>{data.error}</Text>
        )}

        {grouped.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Sin movimientos</Text>
            <Text style={styles.emptySubtitle}>
              Registra tu primer ingreso o gasto
            </Text>
          </View>
        ) : (
          grouped.map((group) => (
            <View key={group.label} style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              {group.items.map((tx, i) => (
                <View key={tx.id}>
                  <TransactionRow
                    transaction={tx}
                    onLongPress={handleLongPress}
                  />
                  {i < group.items.length - 1 && (
                    <View style={styles.rowDivider} />
                  )}
                </View>
              ))}
              <View style={styles.divider} />
            </View>
          ))
        )}

        {grouped.length > 0 && (
          <Text style={styles.hint}>
            Mantén presionado para eliminar
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
  count: {
    fontSize: 24,
    fontWeight: '200',
    color: colors.textPrimary,
    letterSpacing: -0.5,
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
  addButtonDisabled: { opacity: 0.3 },
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
  emptyTitle: { fontSize: 16, fontWeight: '300', color: colors.textPrimary },
  emptySubtitle: { fontSize: 13, fontWeight: '300', color: colors.textTertiary },
  group: { marginBottom: spacing.sm },
  groupLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  rowDivider: {
    height: 0.5,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },
  hint: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xl,
    letterSpacing: 0.3,
  },
});