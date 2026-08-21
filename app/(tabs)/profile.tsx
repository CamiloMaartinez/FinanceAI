import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../../src/hooks/useProfile';
import { colors, spacing, radius } from '../../src/constants/theme';
import { formatCurrency, formatCurrencyCompact } from '../../src/utils/currency';
import type { Achievement } from '../../src/hooks/useProfile';

function HealthScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? colors.income : score >= 40 ? colors.orange : colors.expense;

  return (
    <View style={styles.scoreContainer}>
      <View style={[styles.scoreRing, { borderColor: color }]}>
        <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
        <Text style={styles.scoreLabel}>/ 100</Text>
      </View>
      <Text style={styles.scoreTitle}>Salud financiera</Text>
      <Text style={styles.scoreSubtitle}>
        {score >= 70 ? '¡Excelente manejo!' : score >= 40 ? 'Vas bien, sigue mejorando' : 'Hay oportunidades de mejora'}
      </Text>
    </View>
  );
}

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  return (
    <View style={[styles.badge, !achievement.unlocked && styles.badgeLocked]}>
      <Ionicons
        name={achievement.icon as any}
        size={22}
        color={achievement.unlocked ? colors.orange : colors.textTertiary}
      />
      <Text style={[styles.badgeTitle, !achievement.unlocked && styles.badgeTitleLocked]}>
        {achievement.title}
      </Text>
      <Text style={styles.badgeDesc} numberOfLines={2}>
        {achievement.description}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { profile, stats, achievements, isLoading, updateName, toggleFaceId } = useProfile();
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [newName, setNewName] = useState('');

  const handleEditName = () => {
    setNewName(profile?.name ?? '');
    setEditNameVisible(true);
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    await updateName(newName.trim());
    setEditNameVisible(false);
  };

  const handleToggleFaceId = async (value: boolean) => {
    await toggleFaceId(value);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.blue} />
      </View>
    );
  }

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Perfil</Text>

        {/* Tarjeta de usuario */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={32} color={colors.blue} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{profile?.name ?? 'Mi Perfil'}</Text>
            <Text style={styles.userSince}>
              {stats?.daysUsing === 0
                ? 'Primer día en FinanceAI'
                : `${stats?.daysUsing} días usando FinanceAI`}
            </Text>
          </View>
          <TouchableOpacity onPress={handleEditName} style={styles.editBtn}>
            <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Puntuación de salud financiera */}
        {stats && <HealthScoreRing score={stats.healthScore} />}

        {/* Estadísticas globales */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionText}>Estadísticas globales</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.totalTransactions ?? 0}</Text>
            <Text style={styles.statLabel}>Transacciones</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrencyCompact(stats?.totalIncome ?? 0)}</Text>
            <Text style={styles.statLabel}>Ingresos totales</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrencyCompact(stats?.totalExpenses ?? 0)}</Text>
            <Text style={styles.statLabel}>Gastos totales</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatCurrencyCompact(stats?.averageMonthlySavings ?? 0)}</Text>
            <Text style={styles.statLabel}>Ahorro promedio/mes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.completedGoals ?? 0}</Text>
            <Text style={styles.statLabel}>Metas completadas</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.income }]}>
              {(stats?.savingsRate ?? 0).toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Tasa de ahorro</Text>
          </View>
        </View>

        {/* Logros */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionText}>
            Logros — {unlockedCount}/{achievements.length} desbloqueados
          </Text>
        </View>

        <View style={styles.badgesGrid}>
          {achievements.map((achievement) => (
            <AchievementBadge key={achievement.id} achievement={achievement} />
          ))}
        </View>

        {/* Configuración */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionText}>Configuración</Text>
        </View>

        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="scan-outline" size={20} color={colors.blue} />
              <Text style={styles.settingLabel}>Face ID / Touch ID</Text>
            </View>
            <Switch
              value={profile?.faceIdEnabled ?? true}
              onValueChange={handleToggleFaceId}
              trackColor={{ false: colors.surfaceSecondary, true: colors.blue }}
              thumbColor="#fff"
            />
          </View>
        </View>

      </ScrollView>

      {/* Modal editar nombre */}
      <Modal
        visible={editNameVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setEditNameVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Tu nombre</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Escribe tu nombre"
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditNameVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveName}
              >
                <Text style={styles.modalSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,122,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  userSince: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  editBtn: { padding: spacing.sm },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  scoreRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  scoreNumber: { fontSize: 28, fontWeight: '700' },
  scoreLabel: { fontSize: 11, color: colors.textTertiary },
  scoreTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  scoreSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  sectionTitle: { marginBottom: spacing.sm, marginTop: spacing.sm },
  sectionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  statLabel: { fontSize: 11, color: colors.textTertiary, textAlign: 'center' },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  badge: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.orange + '40',
  },
  badgeLocked: {
    borderColor: 'transparent',
    opacity: 0.5,
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  badgeTitleLocked: { color: colors.textTertiary },
  badgeDesc: { fontSize: 11, color: colors.textTertiary, textAlign: 'center' },
  settingsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingLabel: { fontSize: 15, color: colors.textPrimary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  modalTitle: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  modalInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  modalButtons: { flexDirection: 'row', gap: spacing.md },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
  },
  modalCancelText: { color: colors.textSecondary, fontWeight: '600' },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.blue,
    alignItems: 'center',
  },
  modalSaveText: { color: '#fff', fontWeight: '600' },
});