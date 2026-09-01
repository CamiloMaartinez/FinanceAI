import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, radius } from '../constants/theme';
import { generateMonthPrediction } from '../services/ai';
import type { MonthPrediction } from '../hooks/useReports';

interface MonthPredictionCardProps {
  prediction: MonthPrediction;
}

export function MonthPredictionCard({ prediction }: MonthPredictionCardProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightError, setInsightError] = useState(false);
  const [isLoadingInsight, setIsLoadingInsight] = useState(true);

  // La proyección numérica es instantánea (matemática local); el comentario
  // de la IA se carga después, en segundo plano, para no bloquear la pantalla.
  useEffect(() => {
    let cancelled = false;
    setIsLoadingInsight(true);
    setInsightError(false);

    generateMonthPrediction({
      spentSoFar: prediction.spentSoFar,
      projectedTotal: prediction.projectedTotal,
      historicalAverage: prediction.historicalAverage,
      budgetLimit: prediction.budgetLimit,
      dayOfMonth: prediction.dayOfMonth,
      daysInMonth: prediction.daysInMonth,
    })
      .then((text) => { if (!cancelled) setInsight(text); })
      .catch(() => { if (!cancelled) setInsightError(true); })
      .finally(() => { if (!cancelled) setIsLoadingInsight(false); });

    return () => { cancelled = true; };
  }, [prediction.spentSoFar, prediction.dayOfMonth]);

  const comparisonBase = prediction.budgetLimit ?? prediction.historicalAverage;
  const isOverPace = comparisonBase !== null && prediction.projectedTotal > comparisonBase;
  const projectionColor = comparisonBase === null
    ? c.textPrimary
    : isOverPace ? c.expense : c.income;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="analytics-outline" size={16} color={c.textSecondary} />
        <Text style={styles.headerText}>Predicción del mes</Text>
        <Text style={styles.dayText}>
          Día {prediction.dayOfMonth} de {prediction.daysInMonth}
        </Text>
      </View>

      <Text style={styles.projectedLabel}>Si sigues a este ritmo, terminarías gastando</Text>
      <Text style={[styles.projectedAmount, { color: projectionColor }]}>
        ${Math.round(prediction.projectedTotal).toLocaleString('es-CO')}
      </Text>

      <View style={styles.referenceRow}>
        {prediction.budgetLimit !== null && (
          <View style={styles.referenceItem}>
            <Text style={styles.referenceLabel}>Presupuesto</Text>
            <Text style={styles.referenceValue}>
              ${Math.round(prediction.budgetLimit).toLocaleString('es-CO')}
            </Text>
          </View>
        )}
        {prediction.historicalAverage !== null && (
          <View style={styles.referenceItem}>
            <Text style={styles.referenceLabel}>Tu promedio</Text>
            <Text style={styles.referenceValue}>
              ${Math.round(prediction.historicalAverage).toLocaleString('es-CO')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.insightBox}>
        {isLoadingInsight ? (
          <View style={styles.insightLoading}>
            <ActivityIndicator size="small" color={c.textTertiary} />
            <Text style={styles.insightLoadingText}>Analizando...</Text>
          </View>
        ) : insightError ? (
          <Text style={styles.insightErrorText}>No se pudo generar el análisis de IA.</Text>
        ) : (
          <Text style={styles.insightText}>{insight}</Text>
        )}
      </View>
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
  headerText: { fontSize: 13, fontWeight: '600', color: c.textSecondary, flex: 1 },
  dayText: { fontSize: 11, color: c.textTertiary },
  projectedLabel: { fontSize: 12.5, color: c.textTertiary, marginBottom: 2 },
  projectedAmount: { fontSize: 28, fontWeight: '700', marginBottom: spacing.md },
  referenceRow: { flexDirection: 'row', gap: spacing.xl, marginBottom: spacing.md },
  referenceItem: { gap: 2 },
  referenceLabel: { fontSize: 11, color: c.textTertiary },
  referenceValue: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  insightBox: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  insightLoading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  insightLoadingText: { fontSize: 12, color: c.textTertiary },
  insightErrorText: { fontSize: 12, color: c.textTertiary },
  insightText: { fontSize: 13, color: c.textSecondary, lineHeight: 18 },
});
