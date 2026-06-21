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
import { colors, spacing } from '../../src/constants/theme';
import { getGreeting } from '../../src/utils/currency';

export default function DashboardScreen() {
  const dashboard = useDashboard();

  if (dashboard.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.blue} />
        <Text style={styles.loadingText}>Cargando FinanceAI...</Text>
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
            tintColor={colors.textPrimary}
          />
        }
      >
        <Text style={styles.greeting}>{getGreeting()} 👋</Text>

        {dashboard.error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {dashboard.error}</Text>
          </View>
        )}

        <BalanceCard
          totalBalance={dashboard.totalBalance}
          netFlow={dashboard.monthlyNet}
        />

        <SummaryCards
          income={dashboard.monthlyIncome}
          expenses={dashboard.monthlyExpenses}
        />

        {dashboard.monthlyChart.length > 0 && (
          <MonthlyBarChart data={dashboard.monthlyChart} />
        )}

        <RecentTransactions transactions={dashboard.recentTransactions} />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex:            1,
    backgroundColor: colors.background,
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color:    colors.textSecondary,
  },
  container: {
    flex:            1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap:     spacing.lg,
    paddingBottom: spacing.xxl,
  },
  greeting: {
    fontSize:   28,
    fontWeight: '700',
    color:      colors.textPrimary,
  },
  errorBox: {
    backgroundColor: 'rgba(255,59,48,0.15)',
    borderRadius:    8,
    padding:         spacing.md,
  },
  errorText: {
    fontSize: 13,
    color:    colors.expense,
  },
});