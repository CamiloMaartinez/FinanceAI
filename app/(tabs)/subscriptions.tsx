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
import { colors, spacing, typography } from '../../src/constants/theme';
import { formatCurrency } from '../../src/utils/currency';
import { getTotalAnnualCost, getTotalMonthlyCost } from '../../src/utils/subscriptionCalculations';
import type { Subscription } from '../../src/models/types';

export default function SubscriptionsScreen() {
  const data = useSubscriptions();
  const [formVisible, setFormVisible] = useState(false);

  const handleSave = async (
    name: string, amount: number, frequency: string,
    nextBillingDate: string, colorHex: string, iconName: string
  ) => {
    await data.addSubscription(name, amount, frequency, nextBillingDate, colorHex, iconName);
  };

  const handleLongPress = (subscription: Subscription) => {
    Alert.alert(
      subscription.name,
      '¿Eliminar esta suscripción?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => data.removeSubscription(subscription) },
      ]
    );
  };

  if (data.isLoading && data.subscriptions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.textTertiary} />
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
            tintColor={colors.textTertiary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.label}>SUSCRIPCIONES</Text>
            <Text style={styles.count}>
              {data.subscriptions.length} activa{data.subscriptions.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setFormVisible(true)}>
            <Ionicons name="add" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {data.subscriptions.length > 0 && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>MENSUAL</Text>
              <Text style={styles.summaryValue}>{formatCurrency(monthlyCost)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>ANUAL</Text>
              <Text style={[styles.summaryValue, { color: colors.expense }]}>
                {formatCurrency(annualCost)}
              </Text>
            </View>
          </View>
        )}

        {data.subscriptions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Sin suscripciones</Text>
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
            Recibirás notificaciones 7, 3 y 1 día antes de cada cobro
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
  summaryRow: {
    flexDirection: 'row',
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  summaryItem: { flex: 1, padding: spacing.lg, alignItems: 'center' },
  summaryDivider: { width: 0.5, backgroundColor: colors.border },
  summaryLabel: { ...typography.label, color: colors.textTertiary, marginBottom: spacing.xs },
  summaryValue: { fontSize: 18, fontWeight: '200', color: colors.textPrimary, letterSpacing: -0.5 },
  empty: { paddingVertical: spacing.xxl * 2, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '300', color: colors.textPrimary },
  emptySubtitle: { fontSize: 13, fontWeight: '300', color: colors.textTertiary, textAlign: 'center' },
  hint: { fontSize: 11, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xl, letterSpacing: 0.3 },
});