import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useBudgets } from '../../src/hooks/useBudgets';
import { BudgetForm } from '../../src/components/BudgetForm';
import { getAllCategories } from '../../src/database/db';
import { useColors, spacing, typography, radius } from '../../src/constants/theme';
import {
  getBudgetProgressColor,
  getBudgetBarWidth,
  getBudgetRemaining,
} from '../../src/utils/budgetCalculations';
import type { Category } from '../../src/models/types';

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function ProgressBar({ percent, color, height = 8 }: { percent: number; color: string; height?: number }) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withTiming(getBudgetBarWidth(percent), { duration: 700 });
  }, [percent]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  return (
    <View style={[styles.progressTrack, { height, borderRadius: height / 2 }]}>
      <Animated.View
        style={[styles.progressFill, barStyle, { backgroundColor: color, borderRadius: height / 2 }]}
      />
    </View>
  );
}

export default function BudgetsScreen() {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const budgets = useBudgets();
  const [formVisible, setFormVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getAllCategories().then(setCategories);
  }, []);

  const handleSave = useCallback(
    async (totalLimit: number, categoryLimits: Record<string, number>) => {
      await budgets.saveBudget(totalLimit, categoryLimits);
      setFormVisible(false);
    },
    [budgets]
  );

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Eliminar presupuesto',
      '¿Seguro que quieres eliminar el presupuesto de este mes? Podrás crear uno nuevo cuando quieras.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => budgets.removeBudget() },
      ]
    );
  }, [budgets]);

  const monthLabel = `${MONTH_NAMES[budgets.month - 1]} ${budgets.year}`;
  const totalColor = getBudgetProgressColor(budgets.totalPercent);
  const totalRemaining = getBudgetRemaining(budgets.totalSpent, budgets.totalLimit);
  const isOverBudget = budgets.totalPercent >= 100;

  if (budgets.isLoading && !budgets.budget) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={c.textTertiary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={budgets.isLoading} onRefresh={budgets.refresh} tintColor={c.textTertiary} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.label}>PRESUPUESTO</Text>
            <Text style={styles.count}>Capitalizado en {monthLabel}</Text>
          </View>
          {budgets.budget && (
            <TouchableOpacity style={styles.editButton} onPress={() => setFormVisible(true)}>
              <Ionicons name="pencil-outline" size={16} color={c.textPrimary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        {!budgets.budget ? (
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={40} color={c.textTertiary} />
            <Text style={styles.emptyTitle}>Sin presupuesto definido</Text>
            <Text style={styles.emptySubtitle}>
              Define un límite mensual para organizar tus gastos y recibir alertas antes de excederte
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => setFormVisible(true)}>
              <Text style={styles.emptyButtonText}>+ Crear presupuesto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Tarjeta resumen total */}
            <View style={styles.totalCard}>
              <View style={styles.totalHeaderRow}>
                <Text style={styles.totalLabel}>Gasto total del mes</Text>
                <Text style={[styles.totalPercent, { color: totalColor }]}>
                  {Math.round(budgets.totalPercent)}%
                </Text>
              </View>
              <Text style={styles.totalAmounts}>
                ${Math.round(budgets.totalSpent).toLocaleString('es-CO')}{' '}
                <Text style={styles.totalAmountsLimit}>
                  de ${Math.round(budgets.totalLimit).toLocaleString('es-CO')}
                </Text>
              </Text>
              <ProgressBar percent={budgets.totalPercent} color={totalColor} height={10} />
              <Text style={[styles.totalRemainingText, isOverBudget && { color: c.expense }]}>
                {isOverBudget
                  ? `Te pasaste por $${Math.round(budgets.totalSpent - budgets.totalLimit).toLocaleString('es-CO')}`
                  : `Te quedan $${Math.round(totalRemaining).toLocaleString('es-CO')} disponibles`}
              </Text>
            </View>

            {/* Categorías con límite */}
            {budgets.categories.length > 0 && (
              <View style={styles.categoriesSection}>
                <Text style={styles.sectionLabel}>POR CATEGORÍA</Text>
                {budgets.categories.map((cat) => {
                  const color = getBudgetProgressColor(cat.percent);
                  return (
                    <View key={cat.categoryId} style={styles.categoryCard}>
                      <View style={styles.categoryRow}>
                        <View style={[styles.categoryIcon, { backgroundColor: cat.categoryColor + '20' }]}>
                          <Ionicons name={cat.categoryIcon as any} size={16} color={cat.categoryColor} />
                        </View>
                        <View style={styles.categoryInfo}>
                          <Text style={styles.categoryName}>{cat.categoryName}</Text>
                          <Text style={styles.categoryAmounts}>
                            ${Math.round(cat.spent).toLocaleString('es-CO')} de ${Math.round(cat.limit).toLocaleString('es-CO')}
                          </Text>
                        </View>
                        <Text style={[styles.categoryPercent, { color }]}>
                          {Math.round(cat.percent)}%
                        </Text>
                      </View>
                      <ProgressBar percent={cat.percent} color={color} height={6} />
                    </View>
                  );
                })}
              </View>
            )}

            <TouchableOpacity style={styles.deleteLink} onPress={handleDelete}>
              <Text style={styles.deleteLinkText}>Eliminar presupuesto de este mes</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <BudgetForm
        visible={formVisible}
        categories={categories}
        initialTotalLimit={budgets.totalLimit}
        initialCategoryLimits={budgets.budget?.categoryLimits ?? {}}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: spacing.lg,
  },
  label: { ...typography.label, color: c.textTertiary, marginBottom: spacing.xs },
  count: { fontSize: 20, fontWeight: '200', color: c.textPrimary, letterSpacing: -0.3, textTransform: 'capitalize' },
  editButton: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 0.5, borderColor: c.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  divider: { height: 0.5, backgroundColor: c.borderStrong, marginBottom: spacing.xl },
  empty: { paddingVertical: spacing.xxl * 2, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '300', color: c.textPrimary, marginTop: spacing.md },
  emptySubtitle: { fontSize: 13, fontWeight: '300', color: c.textTertiary, textAlign: 'center', paddingHorizontal: spacing.lg },
  emptyButton: {
    marginTop: spacing.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl,
    borderWidth: 0.5, borderColor: c.borderStrong, borderRadius: 6,
  },
  emptyButtonText: { fontSize: 13, fontWeight: '300', color: c.textPrimary, letterSpacing: 0.3 },
  totalCard: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  totalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, color: c.textSecondary, fontWeight: '500' },
  totalPercent: { fontSize: 18, fontWeight: '700' },
  totalAmounts: { fontSize: 22, fontWeight: '600', color: c.textPrimary },
  totalAmountsLimit: { fontSize: 14, fontWeight: '400', color: c.textTertiary },
  totalRemainingText: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  progressTrack: {
    backgroundColor: c.surfaceSecondary,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  categoriesSection: { gap: spacing.sm },
  sectionLabel: { ...typography.label, color: c.textTertiary, marginBottom: spacing.xs },
  categoryCard: {
    backgroundColor: c.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  categoryIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  categoryInfo: { flex: 1 },
  categoryName: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  categoryAmounts: { fontSize: 12, color: c.textTertiary, marginTop: 1 },
  categoryPercent: { fontSize: 15, fontWeight: '700' },
  deleteLink: { alignItems: 'center', marginTop: spacing.xl, paddingVertical: spacing.sm },
  deleteLinkText: { fontSize: 12, color: c.textTertiary, textDecorationLine: 'underline' },
});
