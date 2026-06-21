import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReports } from '../../src/hooks/useReports';
import { CategoryPieChart } from '../../src/components/CategoryPieChart';
import { MonthComparisonCard } from '../../src/components/MonthComparisonCard';
import { colors, spacing } from '../../src/constants/theme';
import { exportReportToPdf } from '../../src/services/pdfExport';
import { TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ReportsScreen() {
  const reports = useReports();
  const handleExport = async () => {
    try {
      await exportReportToPdf({
        breakdown: reports.breakdown,
        currentMonthExpense: reports.currentMonthExpense,
        previousMonthExpense: reports.previousMonthExpense,
        monthOverMonthChange: reports.monthOverMonthChange,
      });
    } catch (err) {
      Alert.alert('Error', 'No se pudo generar el PDF. Intenta de nuevo.');
    }
  };

  if (reports.isLoading && reports.breakdown.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.blue} />
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
            refreshing={reports.isLoading}
            onRefresh={reports.refresh}
            tintColor={colors.textPrimary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Reportes</Text>
          <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
            <Ionicons name="share-outline" size={20} color={colors.blue} />
          </TouchableOpacity>
        </View>

        {reports.error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {reports.error}</Text>
          </View>
        )}

        <MonthComparisonCard
          currentMonthExpense={reports.currentMonthExpense}
          previousMonthExpense={reports.previousMonthExpense}
          monthOverMonthChange={reports.monthOverMonthChange}
        />

        <View style={{ height: spacing.lg }} />

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
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
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
});