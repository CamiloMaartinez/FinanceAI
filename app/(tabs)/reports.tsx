import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useReports } from '../../src/hooks/useReports';
import { CategoryPieChart } from '../../src/components/CategoryPieChart';
import { MonthComparisonCard } from '../../src/components/MonthComparisonCard';
import { colors, spacing, typography } from '../../src/constants/theme';
import { exportReportToPdf } from '../../src/services/pdfExport';

export default function ReportsScreen() {
  const reports = useReports();

  const handleExport = async () => {
    try {
      await exportReportToPdf({
        breakdown:            reports.breakdown,
        currentMonthExpense:  reports.currentMonthExpense,
        previousMonthExpense: reports.previousMonthExpense,
        monthOverMonthChange: reports.monthOverMonthChange,
      });
    } catch {
      Alert.alert('Error', 'No se pudo generar el PDF.');
    }
  };

  if (reports.isLoading && reports.breakdown.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.textTertiary} />
      </View>
    );
  }

  const monthName = new Date().toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={reports.isLoading}
            onRefresh={reports.refresh}
            tintColor={colors.textTertiary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.label}>REPORTES</Text>
            <Text style={styles.monthName}>{monthName}</Text>
          </View>
          <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
            <Ionicons name="share-outline" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {reports.error && (
          <Text style={styles.errorText}>{reports.error}</Text>
        )}

        <MonthComparisonCard
          currentMonthExpense={reports.currentMonthExpense}
          previousMonthExpense={reports.previousMonthExpense}
          monthOverMonthChange={reports.monthOverMonthChange}
        />

        <View style={{ height: spacing.xl }} />

        <CategoryPieChart data={reports.breakdown} />

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
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: spacing.lg,
  },
  label: { ...typography.label, color: colors.textTertiary, marginBottom: spacing.xs },
  monthName: {
    fontSize: 22,
    fontWeight: '200',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    textTransform: 'capitalize',
  },
  exportButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 0.5, backgroundColor: colors.borderStrong, marginBottom: spacing.xl },
  errorText: { fontSize: 12, color: colors.expense, marginBottom: spacing.md },
});