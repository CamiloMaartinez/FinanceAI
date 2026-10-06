import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Text } from '../../../src/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useChallenges, type ChallengeProgress } from '../../../src/hooks/useChallenges';
import { ChallengeForm } from '../../../src/components/ChallengeForm';
import { getAllCategories } from '../../../src/database/db';
import { useColors, spacing, typography, radius, fonts } from '../../../src/constants/theme';
import { TAB_BAR_HEIGHT } from '../../../src/constants/layout';
import { AnimatedPressable } from '../../../src/components/ui/AnimatedPressable';
import { BackButton } from '../../../src/components/ui/BackButton';
import { CategoryBadge } from '../../../src/components/icons/CategoryBadge';
import { hapticSave } from '../../../src/utils/haptics';
import type { Category } from '../../../src/models/types';

const STATUS_CONFIG = {
  active:    { label: 'En curso',   tone: 'accent' as const },
  completed: { label: 'Completado', tone: 'income' as const },
  failed:    { label: 'Fallido',    tone: 'expense' as const },
};

function ChallengeCard({ challenge, category, onDelete }: {
  challenge: ChallengeProgress;
  category: Category | undefined;
  onDelete: () => void;
}) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const statusConfig = STATUS_CONFIG[challenge.status];
  const status = { label: statusConfig.label, color: c[statusConfig.tone] };
  const progressPercent = challenge.status === 'active'
    ? Math.min(((challenge.daysTotal - challenge.daysLeft) / challenge.daysTotal) * 100, 100)
    : 100;

  return (
    <AnimatedPressable
      style={styles.card}
      onLongPress={onDelete}
    >
      <View style={styles.cardHeader}>
        <CategoryBadge iconName={category?.iconName ?? 'flag-outline'} colorHex={category?.colorHex} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{challenge.title}</Text>
          <Text style={styles.cardDescription} numberOfLines={2}>{challenge.description}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: status.color }]} />
      </View>

      <Text style={styles.footerText}>
        {challenge.status === 'active' && `${challenge.daysLeft} día${challenge.daysLeft !== 1 ? 's' : ''} restantes`}
        {challenge.status === 'completed' && '¡Lo lograste sin gastar nada! 🎉'}
        {challenge.status === 'failed' && `Se rompió — gastaste $${Math.round(challenge.spentSoFar).toLocaleString('es-CO')}`}
      </Text>
    </AnimatedPressable>
  );
}

export default function ChallengesScreen() {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const challenges = useChallenges();
  const [formVisible, setFormVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getAllCategories().then(setCategories);
  }, []);

  const handleSave = async (title: string, description: string, categoryId: string, days: number) => {
    await challenges.addChallenge(title, description, categoryId, days);
  };

  const handleDelete = (challenge: ChallengeProgress) => {
    Alert.alert(challenge.title, '¿Eliminar este reto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => challenges.removeChallenge(challenge.id) },
    ]);
  };

  if (challenges.isLoading && challenges.challenges.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={c.textTertiary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView
        entering={FadeIn.duration(350)}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={challenges.isLoading} onRefresh={challenges.refresh} tintColor={c.textTertiary} />
        }
      >
        <View style={styles.header}>
          <BackButton />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>RETOS</Text>
            <Text style={styles.count}>
              {challenges.challenges.filter((c) => c.status === 'active').length} activo{challenges.challenges.filter((c) => c.status === 'active').length !== 1 ? 's' : ''}
            </Text>
          </View>
          <AnimatedPressable accessibilityRole="button" accessibilityLabel="Nuevo reto" style={styles.addButton} onPress={() => setFormVisible(true)} onPressFeedback={hapticSave}>
            <Ionicons name="add" size={20} color={c.onAccent} />
          </AnimatedPressable>
        </View>

        <View style={styles.divider} />

        {challenges.challenges.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="flag-outline" size={40} color={c.textTertiary} />
            <Text style={styles.emptyTitle}>Sin retos activos</Text>
            <Text style={styles.emptySubtitle}>
              Ponte a prueba: elige una categoría y evita gastar en ella por un tiempo
            </Text>
            <AnimatedPressable style={styles.emptyButton} onPress={() => setFormVisible(true)} onPressFeedback={hapticSave}>
              <Text style={styles.emptyButtonText}>+ Crear reto</Text>
            </AnimatedPressable>
          </View>
        ) : (
          challenges.challenges.map((ch, i) => (
            <Animated.View key={ch.id} entering={FadeInDown.duration(300).delay(i * 60)}>
              <ChallengeCard
                challenge={ch}
                category={categories.find((cat) => cat.id === ch.categoryId)}
                onDelete={() => handleDelete(ch)}
              />
            </Animated.View>
          ))
        )}

        {challenges.challenges.length > 0 && (
          <Text style={styles.hint}>Mantén presionado un reto para eliminarlo</Text>
        )}
      </Animated.ScrollView>

      <ChallengeForm
        visible={formVisible}
        categories={categories}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
      />
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
  emptyTitle: { fontSize: 16, fontWeight: '300', color: c.textPrimary, marginTop: spacing.md },
  emptySubtitle: { fontSize: 13, fontWeight: '300', color: c.textTertiary, textAlign: 'center', paddingHorizontal: spacing.lg },
  emptyButton: {
    marginTop: spacing.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl,
    borderWidth: 0.5, borderColor: c.borderStrong, borderRadius: 6,
  },
  emptyButtonText: { fontSize: 13, fontWeight: '300', color: c.textPrimary, letterSpacing: 0.3 },
  hint: { fontSize: 11, color: c.textTertiary, textAlign: 'center', marginTop: spacing.xl, letterSpacing: 0.3 },
  card: {
    backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.md, gap: spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  cardDescription: { fontSize: 12, color: c.textTertiary, marginTop: 2, lineHeight: 16 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: c.surfaceSecondary, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  footerText: { fontSize: 12, color: c.textSecondary },
});
