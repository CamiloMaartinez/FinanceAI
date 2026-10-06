import React, { useCallback, useState, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { getMonthInsights } from '../../src/services/alertEngine';
import { describeInsight, type CategoryInsight } from '../../src/utils/spendingInsights';
import { View, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAlerts } from '../../src/hooks/useAlerts';
import { useTransactions } from '../../src/hooks/useTransactions';
import { AlertForm } from '../../src/components/AlertForm';
import { useColors, spacing, typography, fonts } from '../../src/constants/theme';
import { TAB_BAR_HEIGHT } from '../../src/constants/layout';
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable';
import { BackButton } from '../../src/components/ui/BackButton';
import { hapticSave } from '../../src/utils/haptics';
import { ALERT_TYPE_LABELS, ALERT_TYPE_UNITS } from '../../src/hooks/useAlerts';
import type { Alert as AlertRecord, AlertType } from '../../src/hooks/useAlerts';

const ALERT_ICONS: Record<string, keyof typeof import('@expo/vector-icons').Ionicons.glyphMap> = {
  balance_below:          'wallet-outline',
  monthly_expense_above:  'trending-up-outline',
  category_expense_above: 'pricetag-outline',
  goal_progress:          'trophy-outline',
  savings_rate_below:     'stats-chart-outline',
};

export default function AlertsScreen() {
  const alerts = useAlerts();
  const transactions = useTransactions();
  const [formVisible, setFormVisible] = useState(false);
  // Análisis automático del mes (no depende de las alertas que cree el usuario)
  const [insights, setInsights] = useState<CategoryInsight[]>([]);
  useFocusEffect(useCallback(() => {
    getMonthInsights().then(setInsights).catch(() => setInsights([]));
  }, []));
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);

  const handleSave = async (
    title: string,
    type: AlertType,
    condition: string,
    threshold: number,
    categoryId: string | null
  ) => {
    await alerts.addAlert(title, type, condition, threshold, categoryId);
  };

  const handleLongPress = (alert: AlertRecord) => {
    Alert.alert(
      alert.title,
      '¿Eliminar esta alerta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => alerts.removeAlert(alert.id),
        },
      ]
    );
  };

  if (alerts.isLoading) {
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
            refreshing={alerts.isLoading}
            onRefresh={alerts.refresh}
            tintColor={c.textTertiary}
          />
        }
      >
        <View style={styles.header}>
          <BackButton />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>ALERTAS</Text>
            <Text style={styles.count}>
              {alerts.alerts.length} activa{alerts.alerts.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <AnimatedPressable
            style={styles.addButton}
            onPress={() => setFormVisible(true)}
            onPressFeedback={hapticSave}
          >
            <Ionicons name="add" size={20} color={c.onAccent} />
          </AnimatedPressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <Ionicons name="sparkles" size={14} color={c.accent} />
            <Text style={styles.insightsTitle}>Análisis del mes</Text>
          </View>
          {insights.length === 0 ? (
            <Text style={styles.insightsEmpty}>
              Vas en línea con tu promedio de los últimos meses. Te avisaremos si alguna categoría se dispara.
            </Text>
          ) : (
            insights.map((insight) => {
              const { title, body } = describeInsight(insight);
              return (
                <View key={`${insight.categoryId}-${insight.kind}`} style={styles.insightRow}>
                  <Ionicons
                    name={insight.kind === 'over' ? 'alert-circle' : 'speedometer-outline'}
                    size={16}
                    color={insight.kind === 'over' ? c.expense : c.orange}
                  />
                  <View style={styles.insightText}>
                    <Text style={styles.insightRowTitle}>{title}</Text>
                    <Text style={styles.insightRowBody}>{body}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {alerts.alerts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Sin alertas configuradas</Text>
            <Text style={styles.emptySubtitle}>
              Crea alertas para que la app te avise automáticamente sobre tu situación financiera
            </Text>
            <AnimatedPressable
              style={styles.emptyButton}
              onPress={() => setFormVisible(true)}
              onPressFeedback={hapticSave}
            >
              <Text style={styles.emptyButtonText}>+ Nueva alerta</Text>
            </AnimatedPressable>
          </View>
        ) : (
          <>
            {alerts.alerts.map((alert, index) => {
              const unit = ALERT_TYPE_UNITS[alert.type];
              const icon = ALERT_ICONS[alert.type] ?? 'notifications-outline';
              const wasTriggered = alert.lastTriggered !== null;

              return (
                <Animated.View key={alert.id} entering={FadeInDown.duration(300).delay(index * 60)}>
                  <AnimatedPressable
                    style={[
                      styles.alertRow,
                      index < alerts.alerts.length - 1 && styles.alertRowBorder,
                    ]}
                    onLongPress={() => handleLongPress(alert)}
                    pressScale={0.99}
                  >
                    <View style={styles.alertIcon}>
                      <Ionicons
                        name={icon}
                        size={16}
                        color={wasTriggered ? c.income : c.textTertiary}
                      />
                    </View>
                    <View style={styles.alertInfo}>
                      <Text style={styles.alertTitle}>
                        {ALERT_TYPE_LABELS[alert.type]}
                      </Text>
                      <Text style={styles.alertThreshold}>
                        {unit}{Math.round(alert.threshold).toLocaleString('es-CO')}
                      </Text>
                      {alert.lastTriggered && (
                        <Text style={styles.alertTriggered}>
                          Última vez:{' '}
                          {new Date(alert.lastTriggered).toLocaleDateString('es-CO')}
                        </Text>
                      )}
                    </View>
                    <Ionicons
                      name="notifications-outline"
                      size={14}
                      color={wasTriggered ? c.income : c.textTertiary}
                    />
                  </AnimatedPressable>
                </Animated.View>
              );
            })}

            <Text style={styles.hint}>
              Las alertas se evalúan al abrir la app · Mantén presionada para eliminar
            </Text>
          </>
        )}
      </Animated.ScrollView>

      <AlertForm
        visible={formVisible}
        categories={transactions.categories}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  loadingContainer: {
    flex: 1, backgroundColor: c.background,
    alignItems: 'center', justifyContent: 'center',
  },
  container: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: TAB_BAR_HEIGHT + spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  label: { fontFamily: fonts.medium, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: c.textSecondary, marginBottom: 2 },
  count: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6, color: c.textPrimary },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  divider: { height: spacing.sm },
  empty: { paddingVertical: spacing.xxl * 2, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '300', color: c.textPrimary },
  emptySubtitle: {
    fontSize: 13, fontWeight: '300', color: c.textTertiary,
    textAlign: 'center', paddingHorizontal: spacing.xl, lineHeight: 20,
  },
  emptyButton: {
    marginTop: spacing.lg, paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl, borderWidth: 0.5,
    borderColor: c.borderStrong, borderRadius: 6,
  },
  emptyButtonText: { fontSize: 13, fontWeight: '300', color: c.textPrimary, letterSpacing: 0.3 },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  alertRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
  },
  alertIcon: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 0.5, borderColor: c.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  alertInfo: { flex: 1 },
  alertTitle: { fontSize: 13, fontWeight: '300', color: c.textPrimary, marginBottom: 2 },
  alertThreshold: { fontSize: 16, fontWeight: '200', color: c.textPrimary, letterSpacing: -0.3 },
  alertTriggered: { fontSize: 11, fontWeight: '300', color: c.income, marginTop: 2 },
  hint: {
    fontSize: 11, color: c.textTertiary,
    textAlign: 'center', marginTop: spacing.xl, letterSpacing: 0.3,
  },
  insightsCard: { backgroundColor: c.surface, borderRadius: 14, padding: spacing.lg, marginBottom: spacing.xl, gap: spacing.md },
  insightsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  insightsTitle: { fontSize: 13, fontWeight: '600', color: c.textPrimary, letterSpacing: 0.2 },
  insightsEmpty: { fontSize: 13, color: c.textSecondary, lineHeight: 19 },
  insightRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  insightText: { flex: 1 },
  insightRowTitle: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  insightRowBody: { fontSize: 13, color: c.textSecondary, lineHeight: 19, marginTop: 2 },
}); 