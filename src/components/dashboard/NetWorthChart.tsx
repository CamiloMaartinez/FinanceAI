import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, radius, fonts, tabularNums, type ThemeColors } from '../../constants/theme';
import { formatCurrency, formatCurrencyCompact } from '../../utils/currency';
import { hapticToggle } from '../../utils/haptics';
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences';
import { Chip } from '../ui/Chip';
import { Text } from '../ui/Text';
import type { NetWorthPeriod } from '../../models/types';

export const NET_WORTH_PERIODS: { value: NetWorthPeriod; label: string; a11y: string }[] = [
  { value: '7d',  label: '7d',   a11y: '7 días' },
  { value: '30d', label: '30d',  a11y: '30 días' },
  { value: '3m',  label: '3m',   a11y: '3 meses' },
  { value: '6m',  label: '6m',   a11y: '6 meses' },
  { value: '1a',  label: '1a',   a11y: '1 año' },
  { value: 'all', label: 'Todo', a11y: 'Todo el historial' },
];

interface NetWorthChartProps {
  data: { label: string; value: number }[];
  period: NetWorthPeriod;
  onPeriodChange: (period: NetWorthPeriod) => void;
  /** Oculta los montos (modo privacidad del dashboard). */
  hidden?: boolean;
}

const CHART_HEIGHT = 120;
const LABEL_WIDTH = 120;

/**
 * Curva del patrimonio sin ejes, pensada para ir sobre el encabezado
 * lavanda. Al arrastrar el dedo aparece una píldora con el valor y la
 * fecha, con una vibración suave en cada punto nuevo.
 */
export function NetWorthChart({ data, period, onPeriodChange, hidden }: NetWorthChartProps) {
  const c = useColors();
  const s = useMemo(() => createStyles(c), [c]);
  const { reduceMotion } = useAccessibilityPreferences();
  const [width, setWidth] = useState(0);
  const lastPointer = useRef(-1);

  const hasCurve = data.length >= 2;
  const first = hasCurve ? data[0].value : 0;
  const last = hasCurve ? data[data.length - 1].value : 0;
  const change = last - first;
  const isPositive = change >= 0;
  const pct = first > 0 ? (change / first) * 100 : null;

  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  // La curva usa todo el alto: el mínimo del periodo queda abajo, no el cero
  const offset = values.length ? Math.min(...values) : 0;
  const range = Math.max(max - offset, 1);
  const chartData = data.map((d) => ({ value: d.value - offset + range * 0.1, label: d.label, real: d.value }));

  const periodLabel = NET_WORTH_PERIODS.find((p) => p.value === period)?.a11y.toLowerCase() ?? '';
  const summary = hidden
    ? 'Montos ocultos'
    : `${isPositive ? 'Subió' : 'Bajó'} ${formatCurrency(Math.abs(change))} en ${periodLabel}`;

  return (
    <View style={s.container}>
      <View style={s.changePill} accessible accessibilityLabel={summary}>
        <Ionicons name={isPositive ? 'trending-up' : 'trending-down'} size={14} color={isPositive ? c.income : c.expense} />
        <Text style={[s.changeText, { color: isPositive ? c.income : c.expense }]}>
          {hidden ? '••••' : `${isPositive ? '+' : '−'}${formatCurrencyCompact(Math.abs(change))}`}
          {!hidden && pct != null ? `  ${isPositive ? '+' : '−'}${Math.abs(pct).toFixed(1)}%` : ''}
        </Text>
      </View>

      <View
        style={s.chartBox}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Gráfica del patrimonio, ${summary}. Desliza el dedo sobre la gráfica para ver cada punto.`}
      >
        {width > 0 && hasCurve && (
          <LineChart
            key={`${period}-${data.length}`}
            data={chartData}
            width={width}
            height={CHART_HEIGHT}
            spacing={width / (chartData.length - 1)}
            initialSpacing={0}
            endSpacing={0}
            adjustToWidth
            color={c.heroText}
            thickness={2.5}
            curved
            areaChart
            startFillColor={c.heroText}
            endFillColor={c.hero}
            startOpacity={0.18}
            endOpacity={0}
            hideDataPoints
            hideRules
            hideYAxisText
            hideAxesAndRules
            yAxisLabelWidth={0}
            xAxisLabelsHeight={0}
            maxValue={range * 1.25}
            isAnimated={!reduceMotion}
            animationDuration={700}
            disableScroll
            getPointerProps={({ pointerIndex }: { pointerIndex: number }) => {
              if (pointerIndex >= 0 && pointerIndex !== lastPointer.current) {
                lastPointer.current = pointerIndex;
                hapticToggle();
              }
            }}
            pointerConfig={{
              pointerStripHeight: CHART_HEIGHT,
              pointerStripColor: c.heroTextSecondary,
              pointerStripWidth: 1,
              pointerColor: c.heroText,
              radius: 6,
              pointerLabelWidth: LABEL_WIDTH,
              pointerLabelHeight: 48,
              autoAdjustPointerLabelPosition: true,
              shiftPointerLabelY: -8,
              pointerVanishDelay: 1500,
              pointerLabelComponent: (items: { real: number; label: string }[]) => (
                <View style={s.tooltip}>
                  <Text style={s.tooltipValue}>{hidden ? '••••' : formatCurrency(items[0]?.real ?? 0)}</Text>
                  <Text style={s.tooltipLabel}>{items[0]?.label}</Text>
                </View>
              ),
            }}
          />
        )}
        {!hasCurve && (
          <View style={[s.empty, { height: CHART_HEIGHT }]}>
            <Text style={s.emptyText}>Registra movimientos para ver cómo cambia tu patrimonio</Text>
          </View>
        )}
      </View>

      <View style={s.chips}>
        {NET_WORTH_PERIODS.map((p) => (
          <Chip
            key={p.value}
            label={p.label}
            accessibilityLabel={p.a11y}
            selected={p.value === period}
            onPress={() => onPeriodChange(p.value)}
          />
        ))}
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { marginTop: spacing.lg },
    changePill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.sheet,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginBottom: spacing.md,
    },
    changeText: { fontFamily: fonts.semibold, fontSize: 13, ...tabularNums },
    chartBox: { height: CHART_HEIGHT, overflow: 'visible' },
    tooltip: {
      width: LABEL_WIDTH,
      backgroundColor: c.sheet + 'E6', // píldora translúcida
      borderRadius: radius.pill,
      paddingVertical: 6,
      paddingHorizontal: 12,
      alignItems: 'center',
      ...c.shadow.sm,
    },
    tooltipValue: { fontFamily: fonts.bold, fontSize: 14, color: c.textPrimary, ...tabularNums },
    tooltipLabel: { fontFamily: fonts.medium, fontSize: 11, color: c.textSecondary },
    empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
    emptyText: { fontFamily: fonts.medium, fontSize: 13, color: c.heroTextSecondary, textAlign: 'center' },
    chips: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.md,
    },
  });
}
