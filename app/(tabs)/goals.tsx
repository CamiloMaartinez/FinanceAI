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
import { colors, spacing, radius } from '../../src/constants/theme';
import type { Goal } from '../../src/models/types';

export default function GoalsScreen() {
  const goals = useGoals();
  const [formVisible, setFormVisible] = useState(false);

  // Estado para el modal de "abonar"
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');

  const handleSaveGoal = async (
    name: string,
    targetAmount: number,
    targetDate: string,
    priority: string,
    colorHex: string,
    iconName: string
  ) => {
    await goals.addGoal(name, targetAmount, targetDate, priority, colorHex, iconName);
  };

  const handleLongPress = (goal: Goal) => {
    Alert.alert(
      goal.name,
      '¿Eliminar esta meta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => goals.removeGoal(goal.id),
        },
      ]
    );
  };

  const handleConfirmContribute = async () => {
    if (!contributeGoal) return;
    const amount = parseFloat(contributeAmount.replace(/\./g, '').replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto válido para abonar');
      return;
    }
    await goals.contribute(contributeGoal.id, amount);
    setContributeGoal(null);
    setContributeAmount('');
  };

  if (goals.isLoading && goals.goals.length === 0) {
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
            refreshing={goals.isLoading}
            onRefresh={goals.refresh}
            tintColor={colors.textPrimary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Metas</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setFormVisible(true)}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {goals.error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {goals.error}</Text>
          </View>
        )}

        {goals.goals.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="trophy-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Sin metas todavía</Text>
            <Text style={styles.emptySubtitle}>
              Crea tu primera meta de ahorro
            </Text>
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
          <Text style={styles.hint}>
            💡 Mantén presionada una meta para eliminarla
          </Text>
        )}
      </ScrollView>

      <GoalForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSave={handleSaveGoal}
      />

      {/* Modal simple para abonar dinero a la meta */}
      <Modal
        visible={contributeGoal !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setContributeGoal(null)}
      >
        <View style={styles.contributeOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.contributeBox}
          >
            <Text style={styles.contributeTitle}>
              Abonar a "{contributeGoal?.name}"
            </Text>
            <View style={styles.contributeInputWrapper}>
              <Text style={styles.contributePrefix}>$</Text>
              <TextInput
                style={styles.contributeInput}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                value={contributeAmount}
                onChangeText={setContributeAmount}
                keyboardType="numeric"
                autoFocus
              />
            </View>
            <View style={styles.contributeButtons}>
              <TouchableOpacity
                style={styles.contributeCancelBtn}
                onPress={() => { setContributeGoal(null); setContributeAmount(''); }}
              >
                <Text style={styles.contributeCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contributeConfirmBtn}
                onPress={handleConfirmContribute}
              >
                <Text style={styles.contributeConfirmText}>Abonar</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(255,59,48,0.15)',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { fontSize: 13, color: colors.expense },
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
  emptySubtitle: { fontSize: 13, color: colors.textTertiary },
  hint: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  contributeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  contributeBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  contributeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  contributeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  contributePrefix: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  contributeInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  contributeButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  contributeCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
  },
  contributeCancelText: { color: colors.textSecondary, fontWeight: '600' },
  contributeConfirmBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.blue,
    alignItems: 'center',
  },
  contributeConfirmText: { color: '#fff', fontWeight: '600' },
});