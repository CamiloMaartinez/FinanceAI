import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAccounts } from '../../src/hooks/useAccounts';
import { AccountCard } from '../../src/components/AccountCard';
import { AccountForm } from '../../src/components/AccountForm';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { AmountText } from '../../src/components/ui/AmountText';
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable';
import { Button } from '../../src/components/ui/Button';
import { Text } from '../../src/components/ui/Text';
import { useColors, fonts, spacing, type ThemeColors } from '../../src/constants/theme';
import { TAB_BAR_HEIGHT } from '../../src/constants/layout';
import { hapticSave } from '../../src/utils/haptics';
import { openAccountDetail } from '../../src/utils/accountNavigation';

export default function AccountsScreen() {
  const c = useColors();
  const s = useMemo(() => createStyles(c), [c]);
  const accounts = useAccounts();
  const [formVisible, setFormVisible] = useState(false);

  // Al volver del detalle (editar, archivar) la lista se recarga
  const isFirstFocus = useRef(true);
  useFocusEffect(useCallback(() => {
    if (isFirstFocus.current) {
      isFirstFocus.current = false;
      return;
    }
    accounts.refresh().catch(() => {});
  }, [accounts.refresh]));

  if (accounts.isLoading && accounts.accounts.length === 0) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="small" color={c.textTertiary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Animated.ScrollView
        entering={FadeIn.duration(300)}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={accounts.refresh} tintColor={c.textTertiary} />}
      >
        <ScreenHeader
          eyebrow="Más"
          title="Cuentas"
          back
          right={
            <AnimatedPressable
              style={s.addButton}
              onPress={() => setFormVisible(true)}
              onPressFeedback={hapticSave}
              accessibilityRole="button"
              accessibilityLabel="Nueva cuenta"
            >
              <Ionicons name="add" size={22} color={c.onAccent} />
            </AnimatedPressable>
          }
        />

        <Text style={s.totalLabel}>Total en pesos</Text>
        <AmountText value={accounts.totalBalance} size={34} style={s.total} />

        {!!accounts.error && <Text style={s.error}>{accounts.error}</Text>}

        {accounts.accounts.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>Sin cuentas</Text>
            <Text style={s.emptyText}>Agrega tu primera cuenta: efectivo, banco, Nequi…</Text>
            <Button label="Nueva cuenta" onPress={() => setFormVisible(true)} style={s.emptyButton} />
          </View>
        ) : (
          <>
            {accounts.accounts.map((account, i) => (
              <AccountCard
                key={account.id}
                account={account}
                index={i}
                onPress={(acc, origin) => openAccountDetail(acc.id, origin)}
              />
            ))}
            <Text style={s.hint}>Toca una cuenta para ver sus movimientos, editarla o archivarla</Text>
          </>
        )}
      </Animated.ScrollView>

      <AccountForm visible={formVisible} onClose={() => setFormVisible(false)} onSave={accounts.addAccount} />
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    loading: { flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' },
    container: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: spacing.xl, paddingBottom: TAB_BAR_HEIGHT + spacing.xl },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    totalLabel: { fontFamily: fonts.medium, fontSize: 13, color: c.textSecondary },
    total: { marginBottom: spacing.xl },
    error: { fontFamily: fonts.medium, fontSize: 13, color: c.expense, marginBottom: spacing.md },
    empty: { paddingVertical: spacing.xxl * 2, alignItems: 'center', gap: spacing.sm },
    emptyTitle: { fontFamily: fonts.bold, fontSize: 18, color: c.textPrimary },
    emptyText: { fontFamily: fonts.regular, fontSize: 14, color: c.textSecondary, textAlign: 'center' },
    emptyButton: { marginTop: spacing.lg, alignSelf: 'stretch' },
    hint: { fontFamily: fonts.regular, fontSize: 12, color: c.textSecondary, textAlign: 'center', marginTop: spacing.md },
  });
}
