import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useColors, fonts, radius, spacing, tabularNums, type ThemeColors } from '../constants/theme';
import { useAccessibilityPreferences } from '../hooks/useAccessibilityPreferences';
import { hapticToggle } from '../utils/haptics';
import { readableTextOn } from '../utils/color';
import { formatCurrency } from '../utils/currency';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { Text } from './ui/Text';
import { CardItem } from './CardItem';
import type { Card } from '../models/types';

const NETWORK_LABELS: Record<string, string> = { visa: 'VISA', mastercard: 'MASTERCARD', amex: 'AMEX', otra: 'TARJETA' };
export const COMPACT_HEIGHT = 64;
/** Con más tarjetas que esto, la lista empieza agrupada en una pila. */
export const STACK_THRESHOLD = 3;
const PEEK = 10; // cuánto asoma cada tarjeta de la pila

/** Lo que muestra la derecha de la fila: el cupo si se conoce, si no la cuota anual. */
export function cardAmountLabel(card: Card): string {
  if (card.creditLimit) return `Cupo ${formatCurrency(card.creditLimit)}`;
  return card.annualFee === 0 ? 'Sin cuota' : `Cuota ${formatCurrency(card.annualFee)}`;
}

interface CompactCardListProps {
  cards: Card[];
  onToggleFavorite: (card: Card) => void;
  onLongPress: (card: Card) => void;
}

/**
 * Tarjetas como filas de 64 px. Si son muchas se agrupan en una pila que
 * se abre con un resorte; al tocar una fila se expande a la tarjeta completa.
 */
export function CompactCardList({ cards, onToggleFavorite, onLongPress }: CompactCardListProps) {
  const c = useColors();
  const s = useMemo(() => createStyles(c), [c]);
  const { reduceMotion } = useAccessibilityPreferences();
  const [stackOpen, setStackOpen] = useState(cards.length <= STACK_THRESHOLD);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const collapsed = !stackOpen && cards.length > STACK_THRESHOLD;
  const layout = reduceMotion ? undefined : LinearTransition.springify().dampingRatio(0.82).duration(420);
  // En la pila solo se ven las 3 primeras; el resto aparece al abrirla
  const visible = collapsed ? cards.slice(0, STACK_THRESHOLD) : cards;

  return (
    <View>
      {visible.map((card, i) => {
        const expanded = !collapsed && expandedId === card.id;
        return (
          <Animated.View
            key={card.id}
            layout={layout}
            entering={reduceMotion ? undefined : FadeIn.duration(220)}
            exiting={reduceMotion ? undefined : FadeOut.duration(120)}
            style={[
              { zIndex: visible.length - i },
              collapsed && i > 0 ? { marginTop: -(COMPACT_HEIGHT - PEEK), transform: [{ scale: 1 - i * 0.04 }] } : { marginTop: i === 0 ? 0 : spacing.sm },
            ]}
          >
            {expanded ? (
              <CardItem
                card={card}
                onToggleFavorite={onToggleFavorite}
                onLongPress={onLongPress}
                onPress={() => setExpandedId(null)}
              />
            ) : (
              <CompactCard
                card={card}
                s={s}
                // Dentro de la pila, cualquier toque la abre; abierta, cada fila se expande
                onPress={() => {
                  if (collapsed) setStackOpen(true);
                  else setExpandedId(card.id);
                }}
                onLongPress={() => onLongPress(card)}
                a11yHint={collapsed ? `Abre la pila de ${cards.length} tarjetas` : 'Muestra la tarjeta completa'}
                covered={collapsed && i > 0}
              />
            )}
          </Animated.View>
        );
      })}

      {collapsed ? (
        <Animated.View layout={layout}>
          <AnimatedPressable
            onPress={() => setStackOpen(true)}
            onPressFeedback={hapticToggle}
            accessibilityRole="button"
            accessibilityLabel={`Ver las ${cards.length} tarjetas`}
            style={s.stackHint}
          >
            <Text style={s.stackHintText}>+{cards.length - 1} tarjetas · Toca para verlas todas</Text>
          </AnimatedPressable>
        </Animated.View>
      ) : cards.length > STACK_THRESHOLD ? (
        <Animated.View layout={layout}>
          <AnimatedPressable
            onPress={() => { setExpandedId(null); setStackOpen(false); }}
            onPressFeedback={hapticToggle}
            accessibilityRole="button"
            accessibilityLabel="Agrupar las tarjetas en una pila"
            style={s.stackHint}
          >
            <Text style={s.stackHintText}>Agrupar</Text>
          </AnimatedPressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

function CompactCard({ card, s, onPress, onLongPress, a11yHint, covered }: {
  card: Card;
  s: ReturnType<typeof createStyles>;
  onPress: () => void;
  onLongPress: () => void;
  a11yHint: string;
  covered: boolean;
}) {
  const text = readableTextOn(card.colorHex);
  const soft = text === '#FFFFFF' ? 'rgba(255,255,255,0.75)' : 'rgba(42,27,107,0.7)';
  const network = card.network ? NETWORK_LABELS[card.network] ?? card.network.toUpperCase() : null;
  const amount = cardAmountLabel(card);

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressFeedback={hapticToggle}
      pressScale={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${card.name}${card.last4 ? `, terminada en ${card.last4}` : ''}, ${card.bank}. ${amount}`}
      accessibilityHint={a11yHint}
      // Las tarjetas tapadas de la pila no se anuncian por separado
      importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={covered}
      style={s.compact}
    >
      <LinearGradient
        colors={[card.colorHex, shade(card.colorHex, -22)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[s.networkPill, { borderColor: soft }]}>
        <Text style={[s.networkText, { color: text }]} numberOfLines={1}>{network ?? card.bank.slice(0, 10).toUpperCase()}</Text>
      </View>
      <View style={s.compactInfo}>
        <Text style={[s.alias, { color: text }]} numberOfLines={1}>{card.name}</Text>
        <Text style={[s.digits, { color: soft }]} numberOfLines={1}>
          {card.last4 ? `•••• ${card.last4}` : card.bank}
        </Text>
      </View>
      <Text style={[s.amount, { color: text }]} numberOfLines={1}>{amount}</Text>
    </AnimatedPressable>
  );
}

// Oscurece un color para el degradado de la mini tarjeta
function shade(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((num >> 16) + amt);
  const g = clamp(((num >> 8) & 0xff) + amt);
  const b = clamp((num & 0xff) + amt);
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    compact: {
      height: COMPACT_HEIGHT,
      borderRadius: radius.lg + 2,
      overflow: 'hidden',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      gap: spacing.md,
      ...c.shadow.sm,
    },
    networkPill: {
      borderWidth: 1,
      borderRadius: radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 3,
      maxWidth: 92,
    },
    networkText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.8 },
    compactInfo: { flex: 1 },
    alias: { fontFamily: fonts.semibold, fontSize: 15 },
    digits: { fontFamily: fonts.medium, fontSize: 12, marginTop: 1, ...tabularNums },
    amount: { fontFamily: fonts.bold, fontSize: 13, maxWidth: '40%', ...tabularNums },
    stackHint: { alignSelf: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    stackHintText: { fontFamily: fonts.semibold, fontSize: 13, color: c.accent },
  });
}
