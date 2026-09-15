import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, radius } from '../constants/theme';
import type { InvestmentOption, InvestmentRisk } from '../data/investmentOptions';

const RISK_LABELS: Record<InvestmentRisk, string> = {
  bajo: 'Riesgo bajo',
  medio: 'Riesgo medio',
  alto: 'Riesgo alto',
  muy_alto: 'Riesgo muy alto',
};

const RISK_COLORS: Record<InvestmentRisk, string> = {
  bajo: '#34C759',
  medio: '#FF9500',
  alto: '#FF3B30',
  muy_alto: '#AF52DE',
};

interface InvestmentCardProps {
  option: InvestmentOption;
}

export function InvestmentCard({ option }: InvestmentCardProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const [expanded, setExpanded] = useState(false);
  const riskColor = RISK_COLORS[option.risk];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: riskColor + '20' }]}>
          <Ionicons name={option.iconName as any} size={18} color={riskColor} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{option.name}</Text>
          <Text style={styles.category} numberOfLines={1}>{option.category}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={c.textTertiary}
        />
      </View>

      <View style={styles.dataRow}>
        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>Rentabilidad E.A.</Text>
          <Text style={styles.dataValue}>
            {option.minRate}% a {option.maxRate}%
          </Text>
        </View>
        <View style={styles.dataDivider} />
        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>Riesgo</Text>
          <View style={[styles.riskBadge, { backgroundColor: riskColor + '20' }]}>
            <Text style={[styles.riskBadgeText, { color: riskColor }]}>
              {RISK_LABELS[option.risk]}
            </Text>
          </View>
        </View>
      </View>

      {expanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.description}>{option.description}</Text>

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={13} color={c.textTertiary} />
            <Text style={styles.detailText}>{option.liquidity}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={13} color={c.textTertiary} />
            <Text style={styles.detailText}>{option.minAmount}</Text>
          </View>
          <View style={styles.examplesRow}>
            {option.examples.map((ex) => (
              <View key={ex} style={styles.exampleChip}>
                <Text style={styles.exampleChipText}>{ex}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconCircle: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: c.textPrimary },
  category: { fontSize: 11, color: c.textTertiary, marginTop: 1 },
  dataRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  dataItem: { flex: 1, gap: 4 },
  dataDivider: { width: 0.5, backgroundColor: c.borderStrong, marginHorizontal: spacing.sm },
  dataLabel: { fontSize: 11, color: c.textTertiary },
  dataValue: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  riskBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  riskBadgeText: { fontSize: 12, fontWeight: '700' },
  expandedContent: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: c.borderStrong,
    gap: spacing.sm,
  },
  description: { fontSize: 12.5, color: c.textSecondary, lineHeight: 18 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, color: c.textTertiary, flex: 1 },
  examplesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  exampleChip: {
    backgroundColor: c.surfaceTertiary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  exampleChipText: { fontSize: 11, color: c.textSecondary },
});
