import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useGoals } from '../../src/hooks/useGoals';
import { GoalCard } from '../../src/components/GoalCard';
import { GoalForm } from '../../src/components/GoalForm';
import { useColors, spacing, typography, radius } from '../../src/constants/theme';
import { TAB_BAR_HEIGHT } from '../../src/constants/layout';
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable';
import { Button } from '../../src/components/ui/Button';
import { hapticSave, hapticSuccess } from '../../src/utils/haptics';
import type { Goal } from '../../src/models/types';

export default function GoalsScreen() {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const goals = useGoals();
  const [formVisible, setFormVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');

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

  const handleConfirmContribute = async () => {
    if (!contributeGoal) return;
    const amount = parseFloat(contributeAmount.replace(/\./g, '').replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto válido');
      return;
    }
    const wasCompleted = contributeGoal.currentAmount >= contributeGoal.targetAmount;
    const willComplete = contributeGoal.currentAmount + amount >= contributeGoal.targetAmount;
    const goalName = contributeGoal.name;
    const goalTarget = contributeGoal.targetAmount;

    await goals.contribute(contributeGoal.id, amount);

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
    setContributeAmount('');
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
          <View>
            <Text style={styles.label}>METAS</Text>
            <Text style={styles.count}>
              {goals.goals.length} activa{goals.goals.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <AnimatedPressable style={styles.addButton} onPress={() => setFormVisible(true)} onPressFeedback={hapticSave}>
            <Ionicons name="add" size={20} color={c.textPrimary} />
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
          goals.goals.map((goal, i) => (
            <Animated.View key={goal.id} entering={FadeInDown.duration(300).delay(i * 60)}>
              <GoalCard
                goal={goal}
                onContribute={(g) => setContributeGoal(g)}
                onEdit={handleEdit}
                onLongPress={handleLongPress}
              />
            </Animated.View>
          ))
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

      <Modal
        visible={contributeGoal !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setContributeGoal(null)}
      >
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalBox}
          >
            <Text style={styles.modalLabel}>ABONAR A META</Text>
            <Text style={styles.modalTitle}>{contributeGoal?.name}</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={c.textTertiary}
                value={contributeAmount}
                onChangeText={setContributeAmount}
                keyboardType="numeric"
                autoFocus
              />
            </View>
            <View style={styles.modalButtons}>
              <Button
                label="Cancelar"
                variant="secondary"
                onPress={() => { setContributeGoal(null); setContributeAmount(''); }}
                haptic={null}
                style={styles.flexBtn}
              />
              <Button
                label="Abonar"
                variant="primary"
                onPress={handleConfirmContribute}
                style={[styles.flexBtn, { backgroundColor: c.income }]}
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: TAB_BAR_HEIGHT + spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: spacing.lg,
  },
  label: { ...typography.label, color: c.textTertiary, marginBottom: spacing.xs },
  count: { fontSize: 24, fontWeight: '200', color: c.textPrimary, letterSpacing: -0.5 },
  addButton: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 0.5, borderColor: c.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  divider: { height: 0.5, backgroundColor: c.borderStrong, marginBottom: spacing.xl },
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
});