import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../constants/theme';
import { formatCurrency } from '../utils/currency';
import type { Card } from '../models/types';

interface CardItemProps {
  card: Card;
  onToggleFavorite: (card: Card) => void;
  onLongPress: (card: Card) => void;
}

export function CardItem({ card, onToggleFavorite, onLongPress }: CardItemProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onLongPress={() => onLongPress(card)}
      activeOpacity={0.85}
    >
      {/* Barra de color izquierda */}
      <View style={[styles.colorBar, { backgroundColor: card.colorHex }]} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.cardName}>{card.name}</Text>
            <Text style={styles.bankName}>{card.bank}</Text>
          </View>
          <TouchableOpacity
            onPress={() => onToggleFavorite(card)}
            style={styles.favoriteBtn}
          >
            <Ionicons
              name={card.isFavorite ? 'star' : 'star-outline'}
              size={20}
              color={card.isFavorite ? '#FF9500' : colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        {/* Datos principales */}
        <View style={styles.dataRow}>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Cuota anual</Text>
            <Text style={styles.dataValue}>
              {card.annualFee === 0 ? 'Sin cuota' : formatCurrency(card.annualFee)}
            </Text>
          </View>
          <View style={styles.dataDivider} />
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Cashback</Text>
            <Text style={[styles.dataValue, { color: colors.income }]}>
              {card.cashbackPercent > 0 ? `${card.cashbackPercent}%` : 'Sin cashback'}
            </Text>
          </View>
          <View style={styles.dataDivider} />
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Interés EA</Text>
            <Text style={[styles.dataValue, { color: card.interestRate > 30 ? colors.expense : colors.textPrimary }]}>
              {card.interestRate}%
            </Text>
          </View>
        </View>

        {/* Beneficios */}
        {card.benefits.length > 0 && (
          <View style={styles.benefitsRow}>
            {card.benefits.slice(0, 3).map((benefit, index) => (
              <View key={index} style={styles.benefitChip}>
                <Text style={styles.benefitText} numberOfLines={1}>
                  {benefit}
                </Text>
              </View>
            ))}
            {card.benefits.length > 3 && (
              <View style={styles.benefitChip}>
                <Text style={styles.benefitText}>
                  +{card.benefits.length - 3}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  colorBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bankName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  favoriteBtn: {
    padding: 4,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  dataItem: {
    flex: 1,
    alignItems: 'center',
  },
  dataDivider: {
    width: 0.5,
    height: 30,
    backgroundColor: colors.border,
  },
  dataLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 3,
  },
  dataValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  benefitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  benefitChip: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  benefitText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});