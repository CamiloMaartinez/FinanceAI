import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getActivityLog, type ActivityAction, type ActivityEntry } from '../../../src/database/db';
import { ScreenHeader } from '../../../src/components/ui/ScreenHeader';
import { Text } from '../../../src/components/ui/Text';
import { useColors, fonts, spacing, radius, type ThemeColors } from '../../../src/constants/theme';
import { TAB_BAR_HEIGHT } from '../../../src/constants/layout';
import { describeActivity } from '../../../src/utils/activityLog';

// Historial de actividad: qué se creó, editó o eliminó y cuándo, más los
// eventos de seguridad. Solo lectura: las entradas no se pueden cambiar.

const ICONS: Record<ActivityAction, keyof typeof Ionicons.glyphMap> = {
  crear: 'add-circle-outline',
  editar: 'create-outline',
  eliminar: 'trash-outline',
  seguridad: 'shield-checkmark-outline',
  respaldo: 'cloud-done-outline',
};

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ActivityScreen() {
  const c = useColors();
  const s = useMemo(() => createStyles(c), [c]);
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);

  const load = useCallback(async () => {
    setEntries(await getActivityLog(300));
  }, []);

  useFocusEffect(useCallback(() => {
    load().catch(() => setEntries([]));
  }, [load]));

  if (entries === null) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="small" color={c.textTertiary} />
      </View>
    );
  }

  // Agrupa por día, en el orden en que llegan (más recientes primero)
  const groups: { day: string; items: ActivityEntry[] }[] = [];
  for (const e of entries) {
    const day = dayLabel(e.at);
    if (groups[groups.length - 1]?.day !== day) groups.push({ day, items: [] });
    groups[groups.length - 1].items.push(e);
  }

  const tone = (a: ActivityAction) =>
    a === 'eliminar' ? c.expense : a === 'crear' ? c.income : a === 'seguridad' ? c.accent : c.textSecondary;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Animated.ScrollView
        entering={FadeIn.duration(300)}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={c.textTertiary} />}
      >
        <ScreenHeader eyebrow="Seguridad" title="Historial de actividad" back />
        <Text style={s.lead}>
          Cada cambio a tus datos y cada evento de seguridad queda anotado con fecha y hora. El historial no se puede editar ni borrar.
        </Text>

        {entries.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Sin actividad todavía</Text>
            <Text style={s.emptyText}>Cuando registres o cambies algo, aparecerá aquí.</Text>
          </View>
        ) : (
          groups.map((g) => (
            <View key={g.day} style={s.group}>
              <Text style={s.day}>{g.day}</Text>
              <View style={s.card}>
                {g.items.map((e, i) => (
                  <View
                    key={e.id}
                    style={[s.row, i > 0 && s.rowDivider]}
                    accessible
                    accessibilityLabel={`${describeActivity(e)}. ${e.summary}. ${new Date(e.at).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}`}
                  >
                    <Ionicons name={ICONS[e.action] ?? 'ellipse-outline'} size={20} color={tone(e.action)} />
                    <View style={s.rowText}>
                      <Text style={s.title}>{describeActivity(e)}</Text>
                      <Text style={s.summary} numberOfLines={2}>{e.summary}</Text>
                    </View>
                    <Text style={s.time}>
                      {new Date(e.at).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    loading: { flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' },
    container: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: spacing.xl, paddingBottom: TAB_BAR_HEIGHT + spacing.xl },
    lead: { fontFamily: fonts.regular, fontSize: 13, color: c.textSecondary, marginBottom: spacing.lg },
    group: { marginBottom: spacing.lg },
    day: { fontFamily: fonts.bold, fontSize: 13, color: c.textSecondary, marginBottom: spacing.sm },
    card: { backgroundColor: c.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    rowDivider: { borderTopWidth: 0.5, borderTopColor: c.border },
    rowText: { flex: 1 },
    title: { fontFamily: fonts.medium, fontSize: 14, color: c.textPrimary },
    summary: { fontFamily: fonts.regular, fontSize: 12, color: c.textSecondary, marginTop: 2 },
    time: { fontFamily: fonts.regular, fontSize: 12, color: c.textTertiary },
    empty: { paddingVertical: spacing.xxl * 2, alignItems: 'center', gap: spacing.sm },
    emptyTitle: { fontFamily: fonts.bold, fontSize: 18, color: c.textPrimary },
    emptyText: { fontFamily: fonts.regular, fontSize: 14, color: c.textSecondary, textAlign: 'center' },
  });
}
