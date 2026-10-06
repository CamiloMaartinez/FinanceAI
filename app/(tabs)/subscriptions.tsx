import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptions } from '../../src/hooks/useSubscriptions';
import { SubscriptionCard } from '../../src/components/SubscriptionCard';
import { SubscriptionForm } from '../../src/components/SubscriptionForm';
import { useColors, spacing, typography, fonts } from '../../src/constants/theme';
import { TAB_BAR_HEIGHT } from '../../src/constants/layout';
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable';
import { BackButton } from '../../src/components/ui/BackButton';
import { formatCurrency } from '../../src/utils/currency';
import { getTotalAnnualCost, getTotalMonthlyCost } from '../../src/utils/subscriptionCalculations';
import { hapticSave } from '../../src/utils/haptics';
import type { Subscription } from '../../src/models/types';

export default function SubscriptionsScreen() {
  const data = useSubscriptions();
  const [formVisible, setFormVisible] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);

  const handleSave = async (
    name: string, amount: number, frequency: string,
    nextBillingDate: string, colorHex: string, iconName: string
  ) => {
    if (editingSub) {
      await data.editSubscription(editingSub, name, amount, frequency, nextBillingDate, colorHex, iconName);
    } else {
      await data.addSubscription(name, amount, frequency, nextBillingDate, colorHex, iconName);
    }
    hapticSave();
  };

  const handleCloseForm = () => {
    setFormVisible(false);
    setEditingSub(null);
  };

  const handlePress = (subscription: Subscription) => {
    setEditingSub(subscription);
    setFormVisible(true);
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
        <ActivityIndicator size="small" color={c.textTertiary} />
      </View>
    );
  }

  const annualCost  = getTotalAnnualCost(data.subscriptions);
  const monthlyCost = getTotalMonthlyCost(data.subscriptions);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView entering={FadeIn.duration(350)}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={data.isLoading}
            onRefresh={data.refresh}
            tintColor={c.textTertiary}
          />
        }
      >
        <View style={styles.header}>
          <BackButton />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>SUSCRIPCIONES</Text>
            <Text style={styles.count}>
              {data.subscriptions.length} activa{data.subscriptions.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <AnimatedPressable style={styles.addButton} onPress={() => setFormVisible(true)} onPressFeedback={hapticSave}>
            <Ionicons name="add" size={20} color={c.onAccent} />
          </AnimatedPressable>
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
              <Text style={[styles.summaryValue, { color: c.expense }]}>
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
          data.subscriptions.map((sub, i) => (
            <Animated.View key={sub.id} entering={FadeInDown.duration(300).delay(i * 60)}>
              <SubscriptionCard
                subscription={sub}
                onPress={handlePress}
                onLongPress={handleLongPress}
              />
            </Animated.View>
          ))
        )}

        {data.subscriptions.length > 0 && (
          <Text style={styles.hint}>
            Toca para editar · mantén presionado para eliminar. Recibirás notificaciones 7, 3 y 1 día antes de cada cobro.
          </Text>
        )}
      </Animated.ScrollView>

      <SubscriptionForm
        visible={formVisible}
        editingSubscription={editingSub}
        onClose={handleCloseForm}
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
  summaryRow: {
    flexDirection: 'row',
    borderWidth: 0.5,
    borderColor: c.border,
    borderRadius: 8,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  summaryItem: { flex: 1, padding: spacing.lg, alignItems: 'center' },
  summaryDivider: { width: 0.5, backgroundColor: c.border },
  summaryLabel: { ...typography.label, color: c.textTertiary, marginBottom: spacing.xs },
  summaryValue: { fontSize: 18, fontWeight: '200', color: c.textPrimary, letterSpacing: -0.5 },
  empty: { paddingVertical: spacing.xxl * 2, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '300', color: c.textPrimary },
  emptySubtitle: { fontSize: 13, fontWeight: '300', color: c.textTertiary, textAlign: 'center' },
  hint: { fontSize: 11, color: c.textTertiary, textAlign: 'center', marginTop: spacing.xl, letterSpacing: 0.3 },
});