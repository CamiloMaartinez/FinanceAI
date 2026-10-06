import React, { useEffect, useState, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { TextInput } from '../../src/components/ui/TextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTransactions } from '../../src/hooks/useTransactions';
import { TransactionForm } from '../../src/components/TransactionForm';
import { TransactionRow } from '../../src/components/TransactionRow';
import { SwipeToDelete } from '../../src/components/SwipeToDelete';
import {
  TransactionFilters,
  EMPTY_FILTERS,
  countActiveFilters,
  type TransactionFiltersState,
} from '../../src/components/TransactionFilters';
import { filterTransactions } from '../../src/utils/transactionFilters';
import { parseShortcutAmount } from '../../src/utils/shortcutParams';
import { hapticSave, hapticToggle } from '../../src/utils/haptics';
import { useColors, spacing, typography, fonts } from '../../src/constants/theme';
import { TAB_BAR_HEIGHT } from '../../src/constants/layout';
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable';
import type { TransactionInput, TransactionWithCategory } from '../../src/models/types';
import type { RecurrenceFrequency } from '../../src/utils/recurrence';
import { RecurringListModal } from '../../src/components/RecurringListModal';

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
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const data = useTransactions();
  const [formVisible, setFormVisible] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionWithCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [recurringVisible, setRecurringVisible] = useState(false);
  const [filters, setFilters] = useState<TransactionFiltersState>(EMPTY_FILTERS);

  // Atajos de Siri / Apple Pay: financeai://transactions?monto=25000&nota=Starbucks&tipo=ingreso
  // abre el formulario de un movimiento nuevo con esos datos ya escritos.
  // Los botones del inicio abren un movimiento nuevo con ?nuevo=ingreso|gasto|transferencia
  const shortcut = useLocalSearchParams<{ monto?: string; nota?: string; tipo?: string; nuevo?: string; cuenta?: string }>();
  const [prefill, setPrefill] = useState<{ amount?: number; notes?: string; type?: 'expense' | 'income' | 'transfer'; accountId?: string } | null>(null);

  useEffect(() => {
    if (!shortcut.nuevo) return;
    const type = shortcut.nuevo === 'ingreso' ? 'income' : shortcut.nuevo === 'transferencia' ? 'transfer' : 'expense';
    setEditingTx(null);
    setPrefill({ type, accountId: shortcut.cuenta || undefined });
    setFormVisible(true);
    router.setParams({ nuevo: undefined, cuenta: undefined });
  }, [shortcut.nuevo, shortcut.cuenta]);

  useEffect(() => {
    if (!shortcut.monto && !shortcut.nota) return;
    setEditingTx(null);
    setPrefill({
      amount: parseShortcutAmount(shortcut.monto) ?? undefined,
      notes: shortcut.nota?.trim() || undefined,
      type: shortcut.tipo === 'ingreso' ? 'income' : 'expense',
    });
    setFormVisible(true);
    // Limpiamos los parámetros para que el formulario no se reabra solo
    router.setParams({ monto: undefined, nota: undefined, tipo: undefined });
  }, [shortcut.monto, shortcut.nota, shortcut.tipo]);

  const filteredTransactions = useMemo(
    () => filterTransactions(data.transactions, searchQuery, filters),
    [data.transactions, searchQuery, filters]
  );
  const grouped = useMemo(() => groupByDay(filteredTransactions), [filteredTransactions]);
  const activeFilterCount = countActiveFilters(filters);
  const hasActiveSearch = searchQuery.trim().length > 0 || activeFilterCount > 0;

  const handleSave = async (
    input: TransactionInput,
    recurrence: RecurrenceFrequency | null,
    splitWith: string[] | null
  ) => {
    if (editingTx) {
      await data.editTransaction(editingTx, input);
    } else {
      await data.addTransaction(input, recurrence, splitWith);
    }
    hapticSave();
  };

  const handleCloseForm = () => {
    setFormVisible(false);
    setEditingTx(null);
    setPrefill(null);
  };

  // Los movimientos de una deuda se manejan desde Deudas: editarlos o
  // borrarlos aquí descuadraría lo pendiente de esa deuda
  const isDebtMovement = (tx: TransactionWithCategory) => tx.type === 'debt_in' || tx.type === 'debt_out';
  const explainDebtMovement = () => {
    Alert.alert(
      'Movimiento de una deuda',
      'Este movimiento pertenece a una deuda o préstamo. Para cambiarlo, ve a Más → Deudas y préstamos.'
    );
  };

  const handlePress = (tx: TransactionWithCategory) => {
    if (isDebtMovement(tx)) return explainDebtMovement();
    setEditingTx(tx);
    setFormVisible(true);
  };

  const handleSwipeDelete = (tx: TransactionWithCategory) => {
    data.removeTransaction(tx);
  };

  if (data.isLoading && data.transactions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={c.textTertiary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView entering={FadeIn.duration(350)}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={data.isLoading}
            onRefresh={data.refresh}
            tintColor={c.textTertiary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.label}>MOVIMIENTOS</Text>
            <Text style={styles.count}>
              {hasActiveSearch ? `${filteredTransactions.length} de ${data.transactions.length}` : data.transactions.length} registros
            </Text>
          </View>
          <View style={styles.headerActions}>
          <AnimatedPressable
            style={styles.addButton}
            onPress={() => setRecurringVisible(true)}
            onPressFeedback={hapticToggle}
            accessibilityLabel="Movimientos recurrentes"
          >
            <Ionicons name="repeat" size={18} color={c.onAccent} />
          </AnimatedPressable>
          <AnimatedPressable
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
            onPressFeedback={hapticSave}
          >
            <Ionicons name="add" size={20} color={c.textPrimary} />
          </AnimatedPressable>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Búsqueda y filtros */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color={c.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por texto, categoría o monto"
              placeholderTextColor={c.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <AnimatedPressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={c.textTertiary} />
              </AnimatedPressable>
            )}
          </View>
          <AnimatedPressable
            style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
            onPress={() => setFiltersVisible(true)}
            onPressFeedback={hapticToggle}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={activeFilterCount > 0 ? c.blue : c.textPrimary}
            />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </AnimatedPressable>
        </View>

        {data.error && (
          <Text style={styles.errorText}>{data.error}</Text>
        )}

        {grouped.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {hasActiveSearch ? 'Sin resultados' : 'Sin movimientos'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {hasActiveSearch
                ? 'Prueba con otro término o quita algún filtro'
                : 'Registra tu primer ingreso o gasto'}
            </Text>
            {hasActiveSearch && (
              <AnimatedPressable
                style={styles.clearSearchButton}
                onPress={() => { setSearchQuery(''); setFilters(EMPTY_FILTERS); }}
                onPressFeedback={hapticToggle}
              >
                <Text style={styles.clearSearchButtonText}>Limpiar búsqueda y filtros</Text>
              </AnimatedPressable>
            )}
          </View>
        ) : (
          grouped.map((group) => (
            <View key={group.label} style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              {group.items.map((tx, i) => (
                <View key={tx.id}>
                  {isDebtMovement(tx) ? (
                    <TransactionRow transaction={tx} onPress={handlePress} />
                  ) : (
                    <SwipeToDelete onDelete={() => handleSwipeDelete(tx)}>
                      <TransactionRow
                        transaction={tx}
                        onPress={handlePress}
                      />
                    </SwipeToDelete>
                  )}
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
            Toca para editar · desliza a la izquierda para eliminar
          </Text>
        )}
      </Animated.ScrollView>

      <TransactionForm
        visible={formVisible}
        accounts={data.accounts}
        categories={data.categories}
        editingTransaction={editingTx}
        prefill={prefill}
        onClose={handleCloseForm}
        onSave={handleSave}
      />

      <RecurringListModal
        visible={recurringVisible}
        onClose={() => setRecurringVisible(false)}
      />

      <TransactionFilters
        visible={filtersVisible}
        categories={data.categories}
        accounts={data.accounts}
        filters={filters}
        onClose={() => setFiltersVisible(false)}
        onApply={setFilters}
      />
    </SafeAreaView>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: TAB_BAR_HEIGHT + spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  label: { fontFamily: fonts.medium, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: c.textSecondary, marginBottom: 2 },
  count: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6, color: c.textPrimary },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  addButtonDisabled: { opacity: 0.3 },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: c.surface,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: c.textPrimary,
    padding: 0,
  },
  filterButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: c.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    borderColor: c.blue,
    backgroundColor: c.accent + '1A',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: c.blue,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  clearSearchButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 0.5,
    borderColor: c.borderStrong,
    borderRadius: 6,
  },
  clearSearchButtonText: { fontSize: 13, color: c.textPrimary },
  divider: { height: spacing.sm },
  errorText: { fontSize: 12, color: c.expense, marginBottom: spacing.md },
  empty: {
    paddingVertical: spacing.xxl * 2,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: 16, fontWeight: '300', color: c.textPrimary },
  emptySubtitle: { fontSize: 13, fontWeight: '300', color: c.textTertiary },
  group: { marginBottom: spacing.sm },
  groupLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: c.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  rowDivider: {
    height: 0.5,
    backgroundColor: c.border,
    marginLeft: spacing.md,
  },
  hint: {
    fontSize: 11,
    color: c.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xl,
    letterSpacing: 0.3,
  },
});