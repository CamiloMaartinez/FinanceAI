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
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGoals } from '../../src/hooks/useGoals';
import { GoalCard } from '../../src/components/GoalCard';
import { GoalForm } from '../../src/components/GoalForm';
import { colors, spacing, typography } from '../../src/constants/theme';
import type { Goal } from '../../src/models/types';

export default function GoalsScreen() {
  const goals = useGoals();
  const [formVisible, setFormVisible] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');

  const handleSaveGoal = async (
    name: string, targetAmount: number, targetDate: string,
    priority: string, colorHex: string, iconName: string
  ) => {
    await goals.addGoal(name, targetAmount, targetDate, priority, colorHex, iconName);
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
    await goals.contribute(contributeGoal.id, amount);
    setContributeGoal(null);
    setContributeAmount('');
  };

  if (goals.isLoading && goals.goals.length === 0) {
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
            refreshing={goals.isLoading}
            onRefresh={goals.refresh}
            tintColor={colors.textTertiary}
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
            <Ionicons name="add" size={20} color={colors.textPrimary} />
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
              onLongPress={handleLongPress}
            />
          ))
        )}

        {goals.goals.length > 0 && (
          <Text style={styles.hint}>Mantén presionada una meta para eliminarla</Text>
        )}
      </ScrollView>

      <GoalForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
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
                placeholderTextColor={colors.textTertiary}
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

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: spacing.lg,
  },
  label: { ...typography.label, color: colors.textTertiary, marginBottom: spacing.xs },
  count: { fontSize: 24, fontWeight: '200', color: colors.textPrimary, letterSpacing: -0.5 },
  addButton: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 0.5, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  divider: { height: 0.5, backgroundColor: colors.borderStrong, marginBottom: spacing.xl },
  empty: { paddingVertical: spacing.xxl * 2, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '300', color: colors.textPrimary },
  emptySubtitle: { fontSize: 13, fontWeight: '300', color: colors.textTertiary, textAlign: 'center' },
  emptyButton: {
    marginTop: spacing.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl,
    borderWidth: 0.5, borderColor: colors.borderStrong, borderRadius: 6,
  },
  emptyButtonText: { fontSize: 13, fontWeight: '300', color: colors.textPrimary, letterSpacing: 0.3 },
  hint: { fontSize: 11, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xl, letterSpacing: 0.3 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: spacing.xl },
  modalBox: {
    backgroundColor: colors.surface, borderRadius: 14,
    padding: spacing.xl, gap: spacing.lg,
    borderWidth: 0.5, borderColor: colors.borderStrong,
  },
  modalLabel: { ...typography.label, color: colors.textTertiary },
  modalTitle: { fontSize: 18, fontWeight: '300', color: colors.textPrimary },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 0.5, borderBottomColor: colors.borderStrong,
    paddingBottom: spacing.sm,
  },
  inputPrefix: { fontSize: 24, fontWeight: '200', color: colors.textTertiary, marginRight: spacing.xs },
  input: { flex: 1, fontSize: 24, fontWeight: '200', color: colors.textPrimary },
  modalButtons: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: 6,
    borderWidth: 0.5, borderColor: colors.borderStrong, alignItems: 'center',
  },
  cancelText: { fontSize: 13, fontWeight: '300', color: colors.textSecondary },
  confirmBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: 6, backgroundColor: colors.income, alignItems: 'center' },
  confirmText: { fontSize: 13, fontWeight: '500', color: '#000' },
});