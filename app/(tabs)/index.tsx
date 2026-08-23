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
import { SummaryCards } from '../../src/components/dashboard/SummaryCards';
import { MonthlyBarChart } from '../../src/components/dashboard/MonthlyBarChart';
import { RecentTransactions } from '../../src/components/dashboard/RecentTransactions';
import { colors, spacing, typography } from '../../src/constants/theme';
import { getGreeting } from '../../src/utils/currency';

export default function DashboardScreen() {
  const dashboard = useDashboard();

  if (dashboard.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.textTertiary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={dashboard.isLoading}
            onRefresh={dashboard.refresh}
            tintColor={colors.textTertiary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.appName}>FinanceAI</Text>
        </View>

        {/* Línea superior */}
        <View style={styles.topDivider} />

        {/* Error */}
        {dashboard.error && (
          <Text style={styles.errorText}>{dashboard.error}</Text>
        )}

        {/* Saldo principal */}
        <BalanceCard
          totalBalance={dashboard.totalBalance}
          netFlow={dashboard.monthlyNet}
        />

        {/* Estadísticas en grid */}
        <SummaryCards
          income={dashboard.monthlyIncome}
          expenses={dashboard.monthlyExpenses}
        />

        {/* Gráfica */}
        {dashboard.monthlyChart.length > 0 && (
          <MonthlyBarChart data={dashboard.monthlyChart} />
        )}

        {/* Transacciones recientes */}
        <RecentTransactions transactions={dashboard.recentTransactions} />

      </ScrollView>
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '300',
    color: colors.textTertiary,
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },
  appName: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textTertiary,
    letterSpacing: 0.15,
  },
  topDivider: {
    height: 0.5,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: 12,
    color: colors.expense,
    marginTop: spacing.md,
    fontWeight: '300',
  },
});