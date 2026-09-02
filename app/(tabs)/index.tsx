import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDashboard } from '../../src/hooks/useDashboard';
import { BalanceCard } from '../../src/components/dashboard/BalanceCard';
import { NetWorthChart } from '../../src/components/dashboard/NetWorthChart';
import { SummaryCards } from '../../src/components/dashboard/SummaryCards';
import { MonthlyBarChart } from '../../src/components/dashboard/MonthlyBarChart';
import { RecentTransactions } from '../../src/components/dashboard/RecentTransactions';
import { useColors, spacing, typography } from '../../src/constants/theme';
import { getGreeting } from '../../src/utils/currency';

export default function DashboardScreen() {
  const dashboard = useDashboard();
  const c = useColors();

  const s = StyleSheet.create({
    loadingContainer: {
      flex: 1, backgroundColor: c.background,
      alignItems: 'center', justifyContent: 'center',
    },
    container: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
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

  if (dashboard.isLoading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="small" color={c.textTertiary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle={c.background === '#000000' ? 'light-content' : 'dark-content'} backgroundColor={c.background} />
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={dashboard.isLoading}
            onRefresh={dashboard.refresh}
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
        <BalanceCard totalBalance={dashboard.totalBalance} netFlow={dashboard.monthlyNet} />
        {dashboard.netWorthHistory.length > 0 && <NetWorthChart data={dashboard.netWorthHistory} />}
        <SummaryCards income={dashboard.monthlyIncome} expenses={dashboard.monthlyExpenses} />
        {dashboard.monthlyChart.length > 0 && <MonthlyBarChart data={dashboard.monthlyChart} />}
        <RecentTransactions transactions={dashboard.recentTransactions} />
      </ScrollView>
    </SafeAreaView>
  );
}