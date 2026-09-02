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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../../src/hooks/useProfile';
import { useTheme } from '../../src/context/ThemeContext';
import { useColors, spacing, typography } from '../../src/constants/theme';
import { hapticToggle } from '../../src/utils/haptics';
import { ExchangeRatesModal } from '../../src/components/ExchangeRatesModal';
import { PinSetupModal } from '../../src/components/PinSetupModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Achievement } from '../../src/hooks/useProfile';

export default function ProfileScreen() {
  const { profile, stats, achievements, isLoading, updateName, toggleFaceId } = useProfile();
  const { mode, toggleTheme } = useTheme();
  const c = useColors();
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [ratesModalVisible, setRatesModalVisible] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [newName, setNewName] = useState('');

  const s = StyleSheet.create({
    loadingContainer: {
      flex: 1, backgroundColor: c.background,
      alignItems: 'center', justifyContent: 'center',
    },
    container: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
    header: { paddingVertical: spacing.lg },
    label: { ...typography.label, color: c.textTertiary, marginBottom: spacing.xs },
    nameRow: {
      flexDirection: 'row', alignItems: 'center',
      gap: spacing.sm, marginBottom: 4,
    },
    userName: {
      fontSize: 26, fontWeight: '200',
      color: c.textPrimary, letterSpacing: -0.5,
    },
    daysText: {
      fontSize: 12, fontWeight: '300',
      color: c.textTertiary, letterSpacing: 0.2,
    },
    divider: {
      height: 0.5, backgroundColor: c.borderStrong,
      marginVertical: spacing.xl,
    },
    scoreRow: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.xl,
    },
    scoreLeft: {
      flexDirection: 'row', alignItems: 'baseline', gap: 4,
    },
    scoreNumber: { fontSize: 42, fontWeight: '200', letterSpacing: -2 },
    scoreMax: { fontSize: 14, fontWeight: '300', color: c.textTertiary },
    scoreRight: { flex: 1, gap: spacing.sm },
    scoreTrack: {
      height: 2, backgroundColor: c.surfaceTertiary,
      borderRadius: 1, overflow: 'hidden',
    },
    scoreFill: { height: '100%', borderRadius: 1 },
    scoreStatus: { fontSize: 12, fontWeight: '300', letterSpacing: 0.3 },
    sectionLabel: {
      ...typography.label, color: c.textTertiary, marginBottom: spacing.lg,
    },
    statsGrid: { gap: 0 },
    statRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', paddingVertical: spacing.md,
    },
    statDivider: { height: 0.5, backgroundColor: c.border },
    statLabel: { fontSize: 13, fontWeight: '300', color: c.textSecondary },
    statValue: {
      fontSize: 14, fontWeight: '300',
      color: c.textPrimary, letterSpacing: -0.3,
    },
    achievementsList: { gap: 0 },
    achievementRow: {
      flexDirection: 'row', alignItems: 'center',
      gap: spacing.md, paddingVertical: spacing.md,
      borderBottomWidth: 0.5, borderBottomColor: c.border,
    },
    achievementLocked: { opacity: 0.35 },
    achievementInfo: { flex: 1 },
    achievementTitle: {
      fontSize: 13, fontWeight: '400',
      color: c.textPrimary, marginBottom: 2,
    },
    achievementDesc: {
      fontSize: 11, fontWeight: '300', color: c.textTertiary,
    },
    achievementBadge: {
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: c.income, alignItems: 'center', justifyContent: 'center',
    },
    achievementBadgeText: { fontSize: 10, color: '#000', fontWeight: '600' },
    settingRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', paddingVertical: spacing.md,
    },
    settingLabel: { fontSize: 13, fontWeight: '300', color: c.textPrimary },
    settingDivider: { height: 0.5, backgroundColor: c.border },
    settingDesc: {
      fontSize: 11, fontWeight: '300',
      color: c.textTertiary, marginTop: 2,
    },
    overlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center', padding: spacing.xl,
    },
    modalBox: {
      backgroundColor: c.surface, borderRadius: 14,
      padding: spacing.xl, gap: spacing.lg,
      borderWidth: 0.5, borderColor: c.borderStrong,
    },
    modalLabel: { ...typography.label, color: c.textTertiary },
    modalInput: {
      fontSize: 18, fontWeight: '200', color: c.textPrimary,
      borderBottomWidth: 0.5, borderBottomColor: c.borderStrong,
      paddingBottom: spacing.sm,
    },
    modalButtons: { flexDirection: 'row', gap: spacing.md },
    modalCancelBtn: {
      flex: 1, paddingVertical: spacing.md, borderRadius: 6,
      borderWidth: 0.5, borderColor: c.borderStrong, alignItems: 'center',
    },
    modalCancelText: { fontSize: 13, fontWeight: '300', color: c.textSecondary },
    modalSaveBtn: {
      flex: 1, paddingVertical: spacing.md,
      borderRadius: 6, backgroundColor: c.income, alignItems: 'center',
    },
    modalSaveText: { fontSize: 13, fontWeight: '500', color: '#000' },
  });

  const handleEditName = () => {
    setNewName(profile?.name ?? '');
    setEditNameVisible(true);
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    await updateName(newName.trim());
    setEditNameVisible(false);
  };

  const handleReplayOnboarding = () => {
    Alert.alert(
      'Ver introducción de nuevo',
      'Cierra completamente la app (deslízala hacia arriba desde el selector de apps) y ábrela de nuevo para verla.',
      [
        {
          text: 'Entendido', onPress: async () => {
            await AsyncStorage.removeItem('onboarding-completed');
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="small" color={c.textTertiary} />
      </View>
    );
  }

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const score      = stats?.healthScore ?? 0;
  const scoreColor = score >= 70 ? c.income : score >= 40 ? c.orange : c.expense;
  const scoreLabel = score >= 70 ? 'Excelente' : score >= 40 ? 'En progreso' : 'Por mejorar';

  const statItems = [
    { label: 'Transacciones',    value: String(stats?.totalTransactions ?? 0),                                          color: c.textPrimary },
    { label: 'Ingresos totales', value: `$${Math.round(stats?.totalIncome ?? 0).toLocaleString('es-CO')}`,              color: c.income      },
    { label: 'Gastos totales',   value: `$${Math.round(stats?.totalExpenses ?? 0).toLocaleString('es-CO')}`,            color: c.expense     },
    { label: 'Ahorro promedio',  value: `$${Math.round(stats?.averageMonthlySavings ?? 0).toLocaleString('es-CO')}`,    color: c.textPrimary },
    { label: 'Metas completadas',value: String(stats?.completedGoals ?? 0),                                              color: c.textPrimary },
    { label: 'Tasa de ahorro',   value: `${(stats?.savingsRate ?? 0).toFixed(1)}%`,                                     color: (stats?.savingsRate ?? 0) >= 10 ? c.income : c.textPrimary },
  ];

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.label}>PERFIL</Text>
          <TouchableOpacity style={s.nameRow} onPress={handleEditName}>
            <Text style={s.userName}>{profile?.name ?? 'Mi Perfil'}</Text>
            <Ionicons name="pencil-outline" size={14} color={c.textTertiary} />
          </TouchableOpacity>
          <Text style={s.daysText}>
            {stats?.daysUsing === 0
              ? 'Primer día'
              : `${stats?.daysUsing} días usando FinanceAI`}
          </Text>
        </View>

        <View style={s.divider} />

        {/* Salud financiera */}
        <View style={s.scoreRow}>
          <View style={s.scoreLeft}>
            <Text style={[s.scoreNumber, { color: scoreColor }]}>{score}</Text>
            <Text style={s.scoreMax}>/100</Text>
          </View>
          <View style={s.scoreRight}>
            <View style={s.scoreTrack}>
              <View style={[s.scoreFill, { width: `${score}%`, backgroundColor: scoreColor }]} />
            </View>
            <Text style={[s.scoreStatus, { color: scoreColor }]}>{scoreLabel}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Estadísticas */}
        <Text style={s.sectionLabel}>ESTADÍSTICAS GLOBALES</Text>
        <View style={s.statsGrid}>
          {statItems.map((item, i) => (
            <View key={item.label}>
              <View style={s.statRow}>
                <Text style={s.statLabel}>{item.label}</Text>
                <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
              </View>
              {i < statItems.length - 1 && <View style={s.statDivider} />}
            </View>
          ))}
        </View>

        <View style={s.divider} />

        {/* Logros */}
        <Text style={s.sectionLabel}>
          LOGROS — {unlockedCount}/{achievements.length}
        </Text>
        <View style={s.achievementsList}>
          {achievements.map((a) => (
            <View
              key={a.id}
              style={[s.achievementRow, !a.unlocked && s.achievementLocked]}
            >
              <Ionicons
                name={a.icon as any}
                size={18}
                color={a.unlocked ? c.income : c.textTertiary}
              />
              <View style={s.achievementInfo}>
                <Text style={[
                  s.achievementTitle,
                  !a.unlocked && { color: c.textTertiary },
                ]}>
                  {a.title}
                </Text>
                <Text style={s.achievementDesc}>{a.description}</Text>
              </View>
              {a.unlocked && (
                <View style={s.achievementBadge}>
                  <Text style={s.achievementBadgeText}>✓</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={s.divider} />

        {/* Configuración */}
        <Text style={s.sectionLabel}>CONFIGURACIÓN</Text>
        <View style={s.settingRow}>
          <Text style={s.settingLabel}>Face ID / Touch ID</Text>
          <Switch
            value={profile?.faceIdEnabled ?? true}
            onValueChange={(v) => { hapticToggle(); toggleFaceId(v); }}
            trackColor={{ false: c.surfaceTertiary, true: c.income }}
            thumbColor="#fff"
          />
        </View>
        <View style={s.settingDivider} />
        <TouchableOpacity style={s.settingRow} onPress={() => setPinModalVisible(true)}>
          <View>
            <Text style={s.settingLabel}>PIN de respaldo</Text>
            <Text style={s.settingDesc}>Por si Face ID falla</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
        </TouchableOpacity>
        <View style={s.settingDivider} />
        <View style={s.settingRow}>
          <View>
            <Text style={s.settingLabel}>Modo claro</Text>
            <Text style={s.settingDesc}>
              {mode === 'light' ? 'Activado' : 'Desactivado'}
            </Text>
          </View>
          <Switch
            value={mode === 'light'}
            onValueChange={() => { hapticToggle(); toggleTheme(); }}
            trackColor={{ false: c.surfaceTertiary, true: c.income }}
            thumbColor="#fff"
          />
        </View>
        <View style={s.settingDivider} />
        <TouchableOpacity style={s.settingRow} onPress={() => setRatesModalVisible(true)}>
          <View>
            <Text style={s.settingLabel}>Tasas de cambio</Text>
            <Text style={s.settingDesc}>Para cuentas en USD o EUR</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
        </TouchableOpacity>
        <View style={s.settingDivider} />
        <TouchableOpacity style={s.settingRow} onPress={handleReplayOnboarding}>
          <View>
            <Text style={s.settingLabel}>Ver introducción de nuevo</Text>
            <Text style={s.settingDesc}>Las pantallas de bienvenida</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
        </TouchableOpacity>
      </ScrollView>

      {/* Modal editar nombre */}
      <Modal
        visible={editNameVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setEditNameVisible(false)}
      >
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <Text style={s.modalLabel}>TU NOMBRE</Text>
            <TextInput
              style={s.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Escribe tu nombre"
              placeholderTextColor={c.textTertiary}
              autoFocus
            />
            <View style={s.modalButtons}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => setEditNameVisible(false)}
              >
                <Text style={s.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSaveBtn} onPress={handleSaveName}>
                <Text style={s.modalSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ExchangeRatesModal
        visible={ratesModalVisible}
        onClose={() => setRatesModalVisible(false)}
      />

      <PinSetupModal
        visible={pinModalVisible}
        onClose={() => setPinModalVisible(false)}
      />
    </SafeAreaView>
  );
}