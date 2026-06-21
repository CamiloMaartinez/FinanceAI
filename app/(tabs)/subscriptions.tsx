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
import { useSubscriptions } from '../../src/hooks/useSubscriptions';
import { SubscriptionCard } from '../../src/components/SubscriptionCard';
import { SubscriptionForm } from '../../src/components/SubscriptionForm';
import { colors, spacing, radius } from '../../src/constants/theme';
import { formatCurrency } from '../../src/utils/currency';
import {
  getTotalAnnualCost,
  getTotalMonthlyCost,
} from '../../src/utils/subscriptionCalculations';
import type { Subscription } from '../../src/models/types';

export default function SubscriptionsScreen() {
  const data = useSubscriptions();
  const [formVisible, setFormVisible] = useState(false);

  const handleSave = async (
    name: string,
    amount: number,
    frequency: string,
    nextBillingDate: string,
    colorHex: string,
    iconName: string
  ) => {
    await data.addSubscription(name, amount, frequency, nextBillingDate, colorHex, iconName);
  };

  const handleLongPress = (subscription: Subscription) => {
    Alert.alert(
      subscription.name,
      '¿Eliminar esta suscripción? Se cancelarán también sus notificaciones.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => data.removeSubscription(subscription),
        },
      ]
    );
  };

  if (data.isLoading && data.subscriptions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.blue} />
      </View>
    );
  }

  const annualCost  = getTotalAnnualCost(data.subscriptions);
  const monthlyCost = getTotalMonthlyCost(data.subscriptions);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={data.isLoading}
            onRefresh={data.refresh}
            tintColor={colors.textPrimary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Suscripciones</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setFormVisible(true)}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {data.error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {data.error}</Text>
          </View>
        )}

        {/* Resumen de gasto */}
        {data.subscriptions.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Gasto mensual</Text>
              <Text style={styles.summaryValue}>{formatCurrency(monthlyCost)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Gasto anual</Text>
              <Text style={styles.summaryValue}>{formatCurrency(annualCost)}</Text>
            </View>
          </View>
        )}

        {data.subscriptions.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="repeat-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Sin suscripciones todavía</Text>
            <Text style={styles.emptySubtitle}>
              Registra Netflix, Spotify u otros servicios
            </Text>
          </View>
        ) : (
          data.subscriptions.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              subscription={sub}
              onLongPress={handleLongPress}
            />
          ))
        )}

        {data.subscriptions.length > 0 && (
          <Text style={styles.hint}>
            💡 Recibirás notificaciones 7, 3 y 1 día antes de cada cobro
          </Text>
        )}
      </ScrollView>

      <SubscriptionForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
      />
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
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: {
    width: 0.5,
    backgroundColor: colors.border,
  },
  summaryLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
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
});