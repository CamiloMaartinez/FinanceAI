import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useDashboard } from '../../src/hooks/useDashboard';
import { useAccounts } from '../../src/hooks/useAccounts';
import { WalletDashboard } from '../../src/components/wallet/WalletDashboard';
import { WALLET_REFLOW } from '../../src/components/wallet/WalletStack';
import { NetWorthChart } from '../../src/components/dashboard/NetWorthChart';
import { SummaryCards } from '../../src/components/dashboard/SummaryCards';
import { MonthlyBarChart } from '../../src/components/dashboard/MonthlyBarChart';
import { RecentTransactions } from '../../src/components/dashboard/RecentTransactions';
import { useColors, spacing, typography } from '../../src/constants/theme';
import { TAB_BAR_HEIGHT } from '../../src/constants/layout';
import { useTheme } from '../../src/context/ThemeContext';
import { getGreeting } from '../../src/utils/currency';

export default function DashboardScreen() {
  const dashboard = useDashboard();
  const accountsState = useAccounts();
  const router = useRouter();
  const c = useColors();
  const { isDark } = useTheme();
  // Con una tarjeta abierta el scroll se bloquea: el arrastre vertical de la
  // tarjeta (cerrar) y el del ScrollView competirían por el mismo dedo.
  const [walletOpen, setWalletOpen] = useState(false);

  const refreshAll = useCallback(async () => {
    await Promise.all([dashboard.refresh(), accountsState.refresh()]);
  }, [dashboard.refresh, accountsState.refresh]);

  const s = StyleSheet.create({
    loadingContainer: {
      flex: 1, backgroundColor: c.background,
      alignItems: 'center', justifyContent: 'center',
    },
    container: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: spacing.xl, paddingBottom: TAB_BAR_HEIGHT + spacing.xl },
    header: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', paddingVertical: spacing.lg,
    },
    greeting: {
      fontSize: 13, fontWeight: '300',
      color: c.textTertiary, letterSpacing: 0.3, fontStyle: 'italic',
    },
    appName: {
      fontSize: 11, fontWeight: '500',
      color: c.textTertiary, letterSpacing: 0.15,
    },
    topDivider: { height: 0.5, backgroundColor: c.borderStrong, marginBottom: spacing.xs },
    errorText: { fontSize: 12, color: c.expense, marginTop: spacing.md, fontWeight: '300' },
  });

  if (dashboard.isLoading || accountsState.isLoading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="small" color={c.textTertiary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.background} />
      <Animated.ScrollView entering={FadeIn.duration(350)}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!walletOpen}
        refreshControl={
          <RefreshControl
            refreshing={dashboard.isLoading}
            onRefresh={refreshAll}
            tintColor={c.textTertiary}
          />
        }
      >
        <View style={s.header}>
          <Text style={s.greeting}>{getGreeting()}</Text>
          <Text style={s.appName}>FinanceAI</Text>
        </View>
        <View style={s.topDivider} />
        {dashboard.error && <Text style={s.errorText}>{dashboard.error}</Text>}
        <WalletDashboard
          accounts={accountsState.accounts}
          totalBalance={dashboard.totalBalance}
          monthlyNet={dashboard.monthlyNet}
          onViewTransactions={() => router.navigate('/transactions')}
          onManageAccount={() => router.navigate('/accounts')}
          onAddAccount={() => router.navigate('/accounts')}
          onExpandedChange={setWalletOpen}
        />
        {/* Todo lo que queda debajo del mazo se reacomoda con resorte cuando este crece o se encoge. */}
        <Animated.View layout={WALLET_REFLOW}>
          {dashboard.netWorthHistory.length > 0 && <NetWorthChart data={dashboard.netWorthHistory} />}
          <SummaryCards income={dashboard.monthlyIncome} expenses={dashboard.monthlyExpenses} />
          {dashboard.monthlyChart.length > 0 && <MonthlyBarChart data={dashboard.monthlyChart} />}
          <RecentTransactions transactions={dashboard.recentTransactions} />
        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}