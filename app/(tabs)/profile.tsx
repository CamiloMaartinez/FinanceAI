import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../../src/hooks/useProfile';
import { colors, spacing, typography } from '../../src/constants/theme';
import { formatCurrencyCompact } from '../../src/utils/currency';
import type { Achievement } from '../../src/hooks/useProfile';

function HealthScore({ score }: { score: number }) {
  const color = score >= 70 ? colors.income : score >= 40 ? colors.orange : colors.expense;
  const label = score >= 70 ? 'Excelente' : score >= 40 ? 'En progreso' : 'Por mejorar';

  return (
    <View style={styles.scoreRow}>
      <View style={styles.scoreLeft}>
        <Text style={styles.scoreLabel}>SALUD FINANCIERA</Text>
        <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
        <Text style={styles.scoreMax}>/100</Text>
      </View>
      <View style={styles.scoreRight}>
        <View style={styles.scoreTrack}>
          <View style={[styles.scoreFill, { width: `${score}%`, backgroundColor: color }]} />
        </View>
        <Text style={[styles.scoreStatus, { color }]}>{label}</Text>
      </View>
    </View>
  );
}

function AchievementRow({ achievement }: { achievement: Achievement }) {
  return (
    <View style={[styles.achievementRow, !achievement.unlocked && styles.achievementLocked]}>
      <Ionicons
        name={achievement.icon as any}
        size={18}
        color={achievement.unlocked ? colors.income : colors.textTertiary}
      />
      <View style={styles.achievementInfo}>
        <Text style={[styles.achievementTitle, !achievement.unlocked && { color: colors.textTertiary }]}>
          {achievement.title}
        </Text>
        <Text style={styles.achievementDesc}>{achievement.description}</Text>
      </View>
      {achievement.unlocked && (
        <View style={styles.achievementBadge}>
          <Text style={styles.achievementBadgeText}>✓</Text>
        </View>
      )}
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.textTertiary} />
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.label}>PERFIL</Text>
            <TouchableOpacity style={styles.nameRow} onPress={handleEditName}>
              <Text style={styles.userName}>{profile?.name ?? 'Mi Perfil'}</Text>
              <Ionicons name="pencil-outline" size={14} color={colors.textTertiary} />
            </TouchableOpacity>
            <Text style={styles.daysText}>
              {stats?.daysUsing === 0 ? 'Primer día' : `${stats?.daysUsing} días usando FinanceAI`}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Salud financiera */}
        {stats && <HealthScore score={stats.healthScore} />}

        <View style={styles.divider} />

        {/* Estadísticas */}
        <Text style={styles.sectionLabel}>ESTADÍSTICAS GLOBALES</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Transacciones registradas</Text>
            <Text style={styles.statValue}>{stats?.totalTransactions ?? 0}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Ingresos totales</Text>
            <Text style={[styles.statValue, { color: colors.income }]}>
              {formatCurrencyCompact(stats?.totalIncome ?? 0)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Gastos totales</Text>
            <Text style={[styles.statValue, { color: colors.expense }]}>
              {formatCurrencyCompact(stats?.totalExpenses ?? 0)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Ahorro promedio mensual</Text>
            <Text style={styles.statValue}>
              {formatCurrencyCompact(stats?.averageMonthlySavings ?? 0)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Metas completadas</Text>
            <Text style={styles.statValue}>{stats?.completedGoals ?? 0}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Tasa de ahorro</Text>
            <Text style={[
              styles.statValue,
              { color: (stats?.savingsRate ?? 0) >= 10 ? colors.income : colors.textPrimary }
            ]}>
              {(stats?.savingsRate ?? 0).toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Logros */}
        <Text style={styles.sectionLabel}>
          LOGROS — {unlockedCount}/{achievements.length}
        </Text>
        <View style={styles.achievementsList}>
          {achievements.map((a) => (
            <AchievementRow key={a.id} achievement={a} />
          ))}
        </View>

        <View style={styles.divider} />

        {/* Configuración */}
        <Text style={styles.sectionLabel}>CONFIGURACIÓN</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Face ID / Touch ID</Text>
          <Switch
            value={profile?.faceIdEnabled ?? true}
            onValueChange={toggleFaceId}
            trackColor={{ false: colors.surfaceTertiary, true: colors.income }}
            thumbColor="#fff"
          />
        </View>
      </ScrollView>

      {/* Modal editar nombre */}
      <Modal
        visible={editNameVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setEditNameVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalLabel}>TU NOMBRE</Text>
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
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveName}>
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
  loadingContainer: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  header: { paddingVertical: spacing.lg },
  label: { ...typography.label, color: colors.textTertiary, marginBottom: spacing.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  userName: { fontSize: 26, fontWeight: '200', color: colors.textPrimary, letterSpacing: -0.5 },
  daysText: { fontSize: 12, fontWeight: '300', color: colors.textTertiary, letterSpacing: 0.2 },
  divider: { height: 0.5, backgroundColor: colors.borderStrong, marginVertical: spacing.xl },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  scoreLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  scoreLabel: { ...typography.label, color: colors.textTertiary, position: 'absolute', top: -16 },
  scoreNumber: { fontSize: 42, fontWeight: '200', letterSpacing: -2 },
  scoreMax: { fontSize: 14, fontWeight: '300', color: colors.textTertiary },
  scoreRight: { flex: 1, gap: spacing.sm },
  scoreTrack: { height: 2, backgroundColor: colors.surfaceTertiary, borderRadius: 1, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: 1 },
  scoreStatus: { fontSize: 12, fontWeight: '300', letterSpacing: 0.3 },
  sectionLabel: { ...typography.label, color: colors.textTertiary, marginBottom: spacing.lg },
  statsGrid: { gap: 0 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  statDivider: { height: 0.5, backgroundColor: colors.border },
  statLabel: { fontSize: 13, fontWeight: '300', color: colors.textSecondary },
  statValue: { fontSize: 14, fontWeight: '300', color: colors.textPrimary, letterSpacing: -0.3 },
  achievementsList: { gap: 0 },
  achievementRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  achievementLocked: { opacity: 0.35 },
  achievementInfo: { flex: 1 },
  achievementTitle: { fontSize: 13, fontWeight: '400', color: colors.textPrimary, marginBottom: 2 },
  achievementDesc: { fontSize: 11, fontWeight: '300', color: colors.textTertiary },
  achievementBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.income, alignItems: 'center', justifyContent: 'center',
  },
  achievementBadgeText: { fontSize: 10, color: '#000', fontWeight: '600' },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: spacing.md,
  },
  settingLabel: { fontSize: 13, fontWeight: '300', color: colors.textPrimary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: spacing.xl },
  modalBox: {
    backgroundColor: colors.surface, borderRadius: 14, padding: spacing.xl,
    gap: spacing.lg, borderWidth: 0.5, borderColor: colors.borderStrong,
  },
  modalLabel: { ...typography.label, color: colors.textTertiary },
  modalInput: {
    fontSize: 18, fontWeight: '200', color: colors.textPrimary,
    borderBottomWidth: 0.5, borderBottomColor: colors.borderStrong, paddingBottom: spacing.sm,
  },
  modalButtons: { flexDirection: 'row', gap: spacing.md },
  modalCancelBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: 6,
    borderWidth: 0.5, borderColor: colors.borderStrong, alignItems: 'center',
  },
  modalCancelText: { fontSize: 13, fontWeight: '300', color: colors.textSecondary },
  modalSaveBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: 6, backgroundColor: colors.income, alignItems: 'center' },
  modalSaveText: { fontSize: 13, fontWeight: '500', color: '#000' },
});