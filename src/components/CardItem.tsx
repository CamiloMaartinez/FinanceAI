import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, spacing, radius } from '../constants/theme';
import { formatCurrency } from '../utils/currency';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { hapticToggle } from '../utils/haptics';
import type { Card } from '../models/types';

interface CardItemProps {
  card: Card;
  onToggleFavorite: (card: Card) => void;
  onLongPress: (card: Card) => void;
}

// Aclara/oscurece un color hex un porcentaje dado. La cara de la tarjeta usa
// un degradado de tres paradas del mismo matiz (claro → base → oscuro), como
// las tarjetas físicas de Apple Wallet — nunca un color plano.
function shade(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}

export function CardItem({ card, onToggleFavorite, onLongPress }: CardItemProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const gradient = useMemo(
    () => [shade(card.colorHex, 16), card.colorHex, shade(card.colorHex, -26)] as const,
    [card.colorHex]
  );

  return (
    <AnimatedPressable
      style={styles.card}
      onLongPress={() => onLongPress(card)}
      pressScale={0.98}
    >
      <View style={styles.cardInner}>
      {/* Cara de la tarjeta: degradado + chip + contactless, como una
          tarjeta física en Apple Wallet. */}
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.face}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.7, y: 0.8 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.faceTop}>
          <View style={styles.chip}>
            <View style={styles.chipLine} />
            <View style={[styles.chipLine, { marginTop: 3 }]} />
          </View>
          <Ionicons name="wifi" size={16} color="rgba(255,255,255,0.8)" style={styles.contactless} />
          <View style={{ flex: 1 }} />
          <AnimatedPressable
            onPress={() => onToggleFavorite(card)}
            onPressFeedback={hapticToggle}
            style={styles.favoriteBtn}
            hitSlop={8}
          >
            <Ionicons
              name={card.isFavorite ? 'star' : 'star-outline'}
              size={19}
              color={card.isFavorite ? '#FFD60A' : 'rgba(255,255,255,0.8)'}
            />
          </AnimatedPressable>
        </View>
        <View style={styles.faceBottom}>
          <Text style={styles.cardName} numberOfLines={1}>{card.name}</Text>
          <Text style={styles.bankName} numberOfLines={1}>{card.bank}</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
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
            <Text style={[styles.dataValue, { color: c.income }]}>
              {card.cashbackPercent > 0 ? `${card.cashbackPercent}%` : 'Sin cashback'}
            </Text>
          </View>
          <View style={styles.dataDivider} />
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>Interés EA</Text>
            <Text style={[styles.dataValue, { color: card.interestRate > 30 ? c.expense : c.textPrimary }]}>
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
      </View>
    </AnimatedPressable>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    ...c.shadow.md,
  },
  cardInner: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  face: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
  faceTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    width: 26,
    height: 19,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.32)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.5)',
    padding: 4,
    justifyContent: 'center',
  },
  chipLine: {
    height: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  contactless: {
    marginLeft: spacing.sm,
    transform: [{ rotate: '90deg' }],
  },
  favoriteBtn: {
    padding: 4,
  },
  faceBottom: {
    gap: 2,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.2,
    color: '#FFFFFF',
  },
  bankName: {
    fontSize: 11.5,
    fontWeight: '500',
    letterSpacing: 0.3,
    color: 'rgba(255,255,255,0.78)',
    textTransform: 'uppercase',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surfaceSecondary,
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
    backgroundColor: c.border,
  },
  dataLabel: {
    fontSize: 11,
    color: c.textTertiary,
    marginBottom: 3,
  },
  dataValue: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textPrimary,
  },
  benefitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  benefitChip: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  benefitText: {
    fontSize: 11,
    color: c.textSecondary,
  },
});