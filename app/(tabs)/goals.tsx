import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useGoals } from '../../src/hooks/useGoals';
import { GoalCard } from '../../src/components/GoalCard';
import { GoalForm } from '../../src/components/GoalForm';
import { useColors, spacing, typography } from '../../src/constants/theme';
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

    await goals.contribute(contributeGoal.id, amount);

    if (!wasCompleted && willComplete) {
      hapticSuccess(); // 🎉 la meta se acaba de completar con este aporte
    } else {
      hapticSave();
    }

    setContributeGoal(null);
    setContributeAmount('');
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
          <TouchableOpacity style={styles.addButton} onPress={() => setFormVisible(true)}>
            <Ionicons name="add" size={20} color={c.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {goals.goals.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Sin metas activas</Text>
            <Text style={styles.emptySubtitle}>Define tu primer objetivo financiero</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => setFormVisible(true)}>
              <Text style={styles.emptyButtonText}>+ Nueva meta</Text>
            </TouchableOpacity>
          </View>
        ) : (
          goals.goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onContribute={(g) => setContributeGoal(g)}
              onEdit={handleEdit}
              onLongPress={handleLongPress}
            />
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
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setContributeGoal(null); setContributeAmount(''); }}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmContribute}>
                <Text style={styles.confirmText}>Abonar</Text>
              </TouchableOpacity>
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
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: spacing.xl },
  modalBox: {
    backgroundColor: c.surface, borderRadius: 14,
    padding: spacing.xl, gap: spacing.lg,
    borderWidth: 0.5, borderColor: c.borderStrong,
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
  cancelBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: 6,
    borderWidth: 0.5, borderColor: c.borderStrong, alignItems: 'center',
  },
  cancelText: { fontSize: 13, fontWeight: '300', color: c.textSecondary },
  confirmBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: 6, backgroundColor: c.income, alignItems: 'center' },
  confirmText: { fontSize: 13, fontWeight: '500', color: '#000' },
});