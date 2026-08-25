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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAlerts } from '../../src/hooks/useAlerts';
import { useTransactions } from '../../src/hooks/useTransactions';
import { AlertForm } from '../../src/components/AlertForm';
import { colors, spacing, typography } from '../../src/constants/theme';
import { ALERT_TYPE_LABELS, ALERT_TYPE_UNITS } from '../../src/hooks/useAlerts';
import type { Alert as AlertType } from '../../src/hooks/useAlerts';

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

  const handleSave = async (
    title: string,
    type: any,
    condition: string,
    threshold: number,
    categoryId: string | null
  ) => {
    await alerts.addAlert(title, type, condition, threshold, categoryId);
  };

  const handleLongPress = (alert: AlertType) => {
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
            refreshing={alerts.isLoading}
            onRefresh={alerts.refresh}
            tintColor={colors.textTertiary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.label}>ALERTAS</Text>
            <Text style={styles.count}>
              {alerts.alerts.length} activa{alerts.alerts.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setFormVisible(true)}
          >
            <Ionicons name="add" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {alerts.alerts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Sin alertas configuradas</Text>
            <Text style={styles.emptySubtitle}>
              Crea alertas para que la app te avise automáticamente sobre tu situación financiera
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setFormVisible(true)}
            >
              <Text style={styles.emptyButtonText}>+ Nueva alerta</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {alerts.alerts.map((alert, index) => {
              const unit = ALERT_TYPE_UNITS[alert.type];
              const icon = ALERT_ICONS[alert.type] ?? 'notifications-outline';
              const wasTriggered = alert.lastTriggered !== null;

              return (
                <TouchableOpacity
                  key={alert.id}
                  style={[
                    styles.alertRow,
                    index < alerts.alerts.length - 1 && styles.alertRowBorder,
                  ]}
                  onLongPress={() => handleLongPress(alert)}
                  activeOpacity={0.7}
                >
                  <View style={styles.alertIcon}>
                    <Ionicons
                      name={icon}
                      size={16}
                      color={wasTriggered ? colors.income : colors.textTertiary}
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
                    color={wasTriggered ? colors.income : colors.textTertiary}
                  />
                </TouchableOpacity>
              );
            })}

            <Text style={styles.hint}>
              Las alertas se evalúan al abrir la app · Mantén presionada para eliminar
            </Text>
          </>
        )}
      </ScrollView>

      <AlertForm
        visible={formVisible}
        categories={transactions.categories}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
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
  emptySubtitle: {
    fontSize: 13, fontWeight: '300', color: colors.textTertiary,
    textAlign: 'center', paddingHorizontal: spacing.xl, lineHeight: 20,
  },
  emptyButton: {
    marginTop: spacing.lg, paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl, borderWidth: 0.5,
    borderColor: colors.borderStrong, borderRadius: 6,
  },
  emptyButtonText: { fontSize: 13, fontWeight: '300', color: colors.textPrimary, letterSpacing: 0.3 },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  alertRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  alertIcon: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 0.5, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  alertInfo: { flex: 1 },
  alertTitle: { fontSize: 13, fontWeight: '300', color: colors.textPrimary, marginBottom: 2 },
  alertThreshold: { fontSize: 16, fontWeight: '200', color: colors.textPrimary, letterSpacing: -0.3 },
  alertTriggered: { fontSize: 11, fontWeight: '300', color: colors.income, marginTop: 2 },
  hint: {
    fontSize: 11, color: colors.textTertiary,
    textAlign: 'center', marginTop: spacing.xl, letterSpacing: 0.3,
  },
}); 