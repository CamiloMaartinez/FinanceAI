import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, RefreshControl, Modal, KeyboardAvoidingView, Platform, Share } from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { TextInput } from '../../src/components/ui/TextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useGoals } from '../../src/hooks/useGoals';
import { GoalCard } from '../../src/components/GoalCard';
import { GoalForm } from '../../src/components/GoalForm';
import { useColors, spacing, typography, radius, pastels, fonts } from '../../src/constants/theme';
import { TAB_BAR_HEIGHT } from '../../src/constants/layout';
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable';
import { BackButton } from '../../src/components/ui/BackButton';
import { Button } from '../../src/components/ui/Button';
import { hapticSave, hapticSuccess } from '../../src/utils/haptics';
import type { Goal, GoalAutoContribution } from '../../src/models/types';
import { RECURRENCE_LABELS, type RecurrenceFrequency } from '../../src/utils/recurrence';
import { AmountEntrySheet } from '../../src/components/AmountEntrySheet';
import { Chip } from '../../src/components/ui/Chip';
import { formatCurrency } from '../../src/utils/currency';

export default function GoalsScreen() {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const goals = useGoals();
  const [formVisible, setFormVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [contributeRepeat, setContributeRepeat] = useState<RecurrenceFrequency | null>(null);

  const handleSaveGoal = async (
    name: string, targetAmount: number, targetDate: string,
    priority: string, colorHex: string, iconName: string
  ) => {
    if (editingGoal) {
      await goals.editGoal(editingGoal.id, name, targetAmount, targetDate, priority, colorHex, iconName);
    } else {
      await goals.addGoal(name, targetAmount, targetDate, priority, colorHex, iconName);
    }
    hapticSave();
  };

  const handleCloseForm = () => {
    setFormVisible(false);
    setEditingGoal(null);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormVisible(true);
  };

  const handleLongPress = (goal: Goal) => {
    Alert.alert(goal.name, '¿Eliminar esta meta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => goals.removeGoal(goal.id) },
    ]);
  };

  const handleConfirmContribute = async (amount: number) => {
    if (!contributeGoal) return;
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto válido');
      return;
    }
    const wasCompleted = contributeGoal.currentAmount >= contributeGoal.targetAmount;
    const willComplete = contributeGoal.currentAmount + amount >= contributeGoal.targetAmount;
    const goalName = contributeGoal.name;
    const goalTarget = contributeGoal.targetAmount;

    await goals.contribute(contributeGoal.id, amount, willComplete ? null : contributeRepeat);

    if (!wasCompleted && willComplete) {
      hapticSuccess(); // 🎉 la meta se acaba de completar con este aporte
      setTimeout(() => {
        Alert.alert(
          '¡Meta completada! 🎉',
          `Lograste ahorrar $${Math.round(goalTarget).toLocaleString('es-CO')} para "${goalName}"`,
          [
            { text: 'Ahora no', style: 'cancel' },
            { text: 'Compartir', onPress: () => shareAchievement(goalName, goalTarget) },
          ]
        );
      }, 400);
    } else {
      hapticSave();
    }

    setContributeGoal(null);
    setContributeRepeat(null);
  };

  const handleStopAuto = (auto: GoalAutoContribution, goalName: string) => {
    Alert.alert(
      'Detener aporte automático',
      `Dejarás de aportar $${Math.round(auto.amount).toLocaleString('es-CO')} a "${goalName}". Lo ya aportado se mantiene.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Detener', style: 'destructive', onPress: () => goals.stopAutoContribution(auto.id) },
      ]
    );
  };

  const shareAchievement = async (goalName: string, targetAmount: number) => {
    try {
      await Share.share({
        message: `🎉 ¡Acabo de completar mi meta "${goalName}" de $${Math.round(targetAmount).toLocaleString('es-CO')} en FinanceAI! 💰`,
      });
    } catch {
      // El usuario canceló el share o hubo un error del sistema — no hacemos nada
    }
  };

  if (goals.isLoading && goals.goals.length === 0) {
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
            refreshing={goals.isLoading}
            onRefresh={goals.refresh}
            tintColor={c.textTertiary}
          />
        }
      >
        <View style={styles.header}>
          <BackButton />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>METAS</Text>
            <Text style={styles.count}>
              {goals.goals.length} activa{goals.goals.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <AnimatedPressable style={styles.addButton} onPress={() => setFormVisible(true)} onPressFeedback={hapticSave}>
            <Ionicons name="add" size={20} color={c.onAccent} />
          </AnimatedPressable>
        </View>

        <View style={styles.divider} />

        {goals.goals.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Sin metas activas</Text>
            <Text style={styles.emptySubtitle}>Define tu primer objetivo financiero</Text>
            <AnimatedPressable style={styles.emptyButton} onPress={() => setFormVisible(true)} onPressFeedback={hapticSave}>
              <Text style={styles.emptyButtonText}>+ Nueva meta</Text>
            </AnimatedPressable>
          </View>
        ) : (
          goals.goals.map((goal, i) => {
            const auto = goals.autoContributions.find((a) => a.goalId === goal.id);
            return (
              <Animated.View key={goal.id} entering={FadeInDown.duration(300).delay(i * 60)}>
                <GoalCard
                  goal={goal}
                  onContribute={(g) => setContributeGoal(g)}
                  onEdit={handleEdit}
                  onLongPress={handleLongPress}
                />
                {auto && (
                  <View style={styles.autoRow}>
                    <Ionicons name="repeat" size={14} color={c.textSecondary} />
                    <Text style={styles.autoText}>
                      Aporte automático: ${Math.round(auto.amount).toLocaleString('es-CO')} {RECURRENCE_LABELS[auto.frequency].toLowerCase()} · próximo{' '}
                      {new Date(auto.nextDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    </Text>
                    <AnimatedPressable onPress={() => handleStopAuto(auto, goal.name)} hitSlop={8}>
                      <Text style={styles.autoStop}>Detener</Text>
                    </AnimatedPressable>
                  </View>
                )}
              </Animated.View>
            );
          })
        )}

        {goals.goals.length > 0 && (
          <Text style={styles.hint}>Mantén presionada una meta para eliminarla</Text>
        )}
      </Animated.ScrollView>

      <GoalForm
        visible={formVisible}
        editingGoal={editingGoal}
        onClose={handleCloseForm}
        onSave={handleSaveGoal}
      />

      <AmountEntrySheet
        visible={contributeGoal !== null}
        title={contributeGoal ? `Aportar a ${contributeGoal.name}` : 'Aportar'}
        subtitle={
          contributeGoal
            ? `Faltan ${formatCurrency(Math.max(contributeGoal.targetAmount - contributeGoal.currentAmount, 0))}`
            : undefined
        }
        headerColor={pastels.mint}
        confirmLabel="Desliza para aportar"
        onConfirm={handleConfirmContribute}
        onClose={() => { setContributeGoal(null); setContributeRepeat(null); }}
      >
        <Text style={styles.repeatLabel}>Repetir automáticamente</Text>
        <View style={styles.repeatRow}>
          {([null, 'weekly', 'biweekly', 'monthly'] as const).map((freq) => (
            <Chip
              key={freq ?? 'none'}
              label={freq ? RECURRENCE_LABELS[freq] : 'No'}
              selected={contributeRepeat === freq}
              onPress={() => setContributeRepeat(freq)}
            />
          ))}
        </View>
        {contributeRepeat && (
          <Text style={styles.repeatHint}>
            Se aportará este monto solo, al abrir la app, hasta completar la meta.
          </Text>
        )}
      </AmountEntrySheet>
    </SafeAreaView>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: TAB_BAR_HEIGHT + spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  label: { fontFamily: fonts.medium, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: c.textSecondary, marginBottom: 2 },
  count: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6, color: c.textPrimary },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  divider: { height: spacing.sm },
  empty: { paddingVertical: spacing.xxl * 2, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '300', color: c.textPrimary },
  emptySubtitle: { fontSize: 13, fontWeight: '300', color: c.textTertiary, textAlign: 'center' },
  emptyButton: {
    marginTop: spacing.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl,
    borderWidth: 0.5, borderColor: c.borderStrong, borderRadius: 6,
  },
  emptyButtonText: { fontSize: 13, fontWeight: '300', color: c.textPrimary, letterSpacing: 0.3 },
  hint: { fontSize: 11, color: c.textTertiary, textAlign: 'center', marginTop: spacing.xl, letterSpacing: 0.3 },
  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', padding: spacing.xl },
  modalBox: {
    backgroundColor: c.surface, borderRadius: radius.lg,
    padding: spacing.xl, gap: spacing.lg,
    borderWidth: 0.5, borderColor: c.borderStrong,
    ...c.shadow.lg,
  },
  modalLabel: { ...typography.label, color: c.textTertiary },
  modalTitle: { fontSize: 18, fontWeight: '300', color: c.textPrimary },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 0.5, borderBottomColor: c.borderStrong,
    paddingBottom: spacing.sm,
  },
  inputPrefix: { fontSize: 24, fontWeight: '200', color: c.textTertiary, marginRight: spacing.xs },
  input: { flex: 1, fontSize: 24, fontWeight: '200', color: c.textPrimary },
  modalButtons: { flexDirection: 'row', gap: spacing.md },
  flexBtn: { flex: 1 },
  autoRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: -spacing.sm, marginBottom: spacing.md, paddingHorizontal: spacing.sm,
  },
  autoText: { flex: 1, fontSize: 12, color: c.textSecondary },
  autoStop: { fontSize: 12, fontWeight: '600', color: c.expense },
  repeatLabel: {
    fontSize: 11.5, fontWeight: '500', color: c.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.4, marginTop: spacing.md,
  },
  repeatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  repeatChip: {
    paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: radius.md,
    backgroundColor: c.surfaceSecondary, borderWidth: 1.5, borderColor: 'transparent',
  },
  repeatChipActive: { borderColor: c.accent, backgroundColor: c.accent + '1F' },
  repeatChipText: { fontSize: 13, color: c.textSecondary },
  repeatChipTextActive: { color: c.textPrimary, fontWeight: '600' },
  repeatHint: { fontSize: 12, color: c.textTertiary, marginTop: spacing.sm, lineHeight: 17 },
});