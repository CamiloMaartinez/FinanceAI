import React, { useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useReports } from '../../src/hooks/useReports';
import { CategoryPieChart } from '../../src/components/CategoryPieChart';
import { MonthComparisonCard } from '../../src/components/MonthComparisonCard';
import { MonthPredictionCard } from '../../src/components/MonthPredictionCard';
import { ComparativeStats } from '../../src/components/ComparativeStats';
import { useColors, spacing, typography, fonts } from '../../src/constants/theme';
import { TAB_BAR_HEIGHT } from '../../src/constants/layout';
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable';
import { hapticSave } from '../../src/utils/haptics';
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
          <AnimatedPressable style={styles.exportButton} onPress={handleExport} onPressFeedback={hapticSave}>
            <Ionicons name="share-outline" size={16} color={c.textSecondary} />
          </AnimatedPressable>
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

        <ComparativeStats breakdown={reports.breakdown} monthlyIncome={reports.currentMonthIncome} />

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
  content: { paddingHorizontal: spacing.xl, paddingBottom: TAB_BAR_HEIGHT + spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  label: { fontFamily: fonts.medium, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: c.textSecondary, marginBottom: 2 },
  monthName: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6, color: c.textPrimary, textTransform: 'capitalize' },
  exportButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', ...c.shadow.sm },
  divider: { height: spacing.sm },
  errorText: { fontSize: 12, color: c.expense, marginBottom: spacing.md },
});