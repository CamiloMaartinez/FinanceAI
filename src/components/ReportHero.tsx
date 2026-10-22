import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui/Text';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { LogoMark } from './brand/LogoMark';
import { darkColors, lightColors, pastels, ink, fonts, radius, spacing, tabularNums } from '../constants/theme';
import { formatCurrency } from '../utils/currency';
import { getSavingsRate } from '../utils/reportCalculations';
import { hapticSave } from '../utils/haptics';

interface ReportHeroProps {
  income: number;
  expense: number;
  exporting: boolean;
  onExport: () => void;
}

// Portada del informe dentro de la app: los mismos colores del logotipo y
// del PDF (índigo → violeta, "Smart" lavanda y "Finance" durazno). Es igual
// en tema claro y oscuro porque la "S" del logo está pensada para fondo oscuro.
const GRADIENT = [darkColors.background, lightColors.primary, lightColors.purple] as const;

export function ReportHero({ income, expense, exporting, onExport }: ReportHeroProps) {
  const net = income - expense;
  const rate = getSavingsRate(income, expense);

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

      <View style={styles.brandRow} accessible accessibilityLabel="Smart Finance, informe del mes">
        <LogoMark size={26} />
        <Text style={styles.brandSmart}>Smart</Text>
        <Text style={styles.brandFinance}>Finance</Text>
      </View>

      <View style={styles.kpis}>
        <Kpi label="Ingresos" value={formatCurrency(income)} color={darkColors.income} />
        <Kpi label="Gastos" value={formatCurrency(expense)} color={darkColors.expense} />
      </View>
      <View style={styles.kpis}>
        <Kpi label="Ahorro neto" value={formatCurrency(net)} color="#FFFFFF" />
        <Kpi label="Tasa de ahorro" value={rate === null ? '—' : `${Math.round(rate)}%`} color="#FFFFFF" />
      </View>

      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="Descargar informe completo en PDF"
        accessibilityState={{ busy: exporting, disabled: exporting }}
        disabled={exporting}
        onPress={onExport}
        onPressFeedback={hapticSave}
        style={styles.cta}
      >
        {exporting ? (
          <ActivityIndicator size="small" color={ink} />
        ) : (
          <Ionicons name="document-text-outline" size={18} color={ink} />
        )}
        <Text style={styles.ctaText}>{exporting ? 'Preparando informe…' : 'Descargar informe PDF'}</Text>
      </AnimatedPressable>
    </View>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.xl, overflow: 'hidden', padding: spacing.lg, gap: spacing.sm, marginBottom: spacing.xl },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xs },
  brandSmart: { fontFamily: fonts.medium, fontSize: 16, color: lightColors.hero },
  brandFinance: { fontFamily: fonts.extrabold, fontSize: 16, color: pastels.peach, letterSpacing: -0.3 },
  kpis: { flexDirection: 'row', gap: spacing.sm },
  kpi: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  kpiLabel: { fontFamily: fonts.medium, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(255,255,255,0.72)' },
  kpiValue: { fontFamily: fonts.extrabold, fontSize: 18, marginTop: 2, ...tabularNums },
  cta: {
    marginTop: spacing.sm,
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: pastels.peach,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  ctaText: { fontFamily: fonts.bold, fontSize: 15, color: ink },
});
