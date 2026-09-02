import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useReports } from '../../src/hooks/useReports';
import { CategoryPieChart } from '../../src/components/CategoryPieChart';
import { MonthComparisonCard } from '../../src/components/MonthComparisonCard';
import { MonthPredictionCard } from '../../src/components/MonthPredictionCard';
import { useColors, spacing, typography } from '../../src/constants/theme';
import { exportReportToPdf } from '../../src/services/pdfExport';

export default function ReportsScreen() {
  const reports = useReports();
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);

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
        <ActivityIndicator size="small" color={c.textTertiary} />
      </View>
    );
  }

  const monthName = new Date().toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView entering={FadeIn.duration(350)}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={reports.isLoading}
            onRefresh={reports.refresh}
            tintColor={c.textTertiary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.label}>REPORTES</Text>
            <Text style={styles.monthName}>{monthName}</Text>
          </View>
          <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
            <Ionicons name="share-outline" size={16} color={c.textSecondary} />
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

        {reports.prediction && (
          <MonthPredictionCard prediction={reports.prediction} />
        )}

        <CategoryPieChart data={reports.breakdown} />

      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: spacing.lg,
  },
  label: { ...typography.label, color: c.textTertiary, marginBottom: spacing.xs },
  monthName: {
    fontSize: 22,
    fontWeight: '200',
    color: c.textPrimary,
    letterSpacing: -0.5,
    textTransform: 'capitalize',
  },
  exportButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: c.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 0.5, backgroundColor: c.borderStrong, marginBottom: spacing.xl },
  errorText: { fontSize: 12, color: c.expense, marginBottom: spacing.md },
});