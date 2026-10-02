import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  useReducedMotion,
} from 'react-native-reanimated';
import { useColors, spacing } from '../../constants/theme';
import { hapticSave, hapticToggle } from '../../utils/haptics';
import { AnimatedPressable } from '../ui/AnimatedPressable';
import { GlassView } from '../ui/GlassView';
import type { Account } from '../../models/types';
import { WalletCard } from './WalletCard';
import {
  CARD_ASPECT,
  DETAILS_MIN_HEIGHT,
  MAX_CARD_WIDTH,
  SHADOW_PAD,
  computeStackLayout,
} from './walletLayout';
import { ACCOUNT_TYPE_LABELS, formatMemberSince } from './walletTheme';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// Builders a nivel de módulo: reconstruirlos en cada render cuesta.
// El panel espera ~120ms a que la tarjeta llegue arriba antes de aparecer;
// sale rápido (~20% más que la entrada, el usuario ya lo leyó).
const DETAILS_ENTER = FadeInDown.duration(260).delay(120).easing(EASE_OUT).reduceMotion(ReduceMotion.System);
const DETAILS_ENTER_REDUCED = FadeIn.duration(200).delay(80);
const DETAILS_EXIT = FadeOut.duration(120);

/** Reflujo del contenedor cuando cambia su alto. Exportado para que la pantalla anime lo que hay debajo. */
export const WALLET_REFLOW = LinearTransition.springify()
  .duration(400)
  .dampingRatio(1)
  .reduceMotion(ReduceMotion.System);

export interface WalletStackProps {
  accounts: Account[];
  hideBalances: boolean;
  onViewTransactions: (account: Account) => void;
  onManageAccount: (account: Account) => void;
  /** Avisa cuando una tarjeta se abre o se cierra (p. ej. para bloquear el scroll padre). */
  onExpandedChange?: (expanded: boolean) => void;
}

export function WalletStack({
  accounts, hideBalances, onViewTransactions, onManageAccount, onExpandedChange,
}: WalletStackProps) {
  const { width: windowWidth } = useWindowDimensions();
  const reduced = useReducedMotion();

  const cardWidth = Math.min(windowWidth - spacing.xl * 2, MAX_CARD_WIDTH);
  const cardHeight = Math.round(cardWidth / CARD_ASPECT);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailsHeight, setDetailsHeight] = useState(DETAILS_MIN_HEIGHT);

  const expandedIndex = accounts.findIndex((a) => a.id === expandedId);
  const expandedAccount = expandedIndex >= 0 ? accounts[expandedIndex] : null;
  const isExpanded = expandedAccount !== null;

  useEffect(() => { onExpandedChange?.(isExpanded); }, [isExpanded, onExpandedChange]);

  const layout = useMemo(
    () => computeStackLayout(accounts.length, isExpanded ? expandedIndex : null, cardHeight, detailsHeight),
    [accounts.length, isExpanded, expandedIndex, cardHeight, detailsHeight],
  );

  // Un háptico por acción del usuario, en el instante del tap.
  const handleCardPress = useCallback((id: string) => {
    if (id === expandedId) {
      hapticSave();                 // cerrar
      setExpandedId(null);
    } else if (expandedId !== null) {
      hapticToggle();               // cambiar de tarjeta: selección
      setExpandedId(id);
    } else {
      hapticSave();                 // abrir
      setExpandedId(id);
    }
  }, [expandedId]);

  // El háptico de este camino ya se disparó en el worklet del gesto.
  const handleDismiss = useCallback(() => setExpandedId(null), []);

  const handleDetailsLayout = useCallback((e: LayoutChangeEvent) => {
    const h = Math.ceil(e.nativeEvent.layout.height);
    setDetailsHeight((prev) => (h > 0 && h !== prev ? h : prev));
  }, []);

  const count = accounts.length;
  const lastIndex = count - 1;

  return (
    <Animated.View
      layout={WALLET_REFLOW}
      style={[
        styles.stack,
        { width: cardWidth + SHADOW_PAD * 2, height: layout.height + SHADOW_PAD },
      ]}
    >
      {accounts.map((account, i) => {
        const isSelected = i === expandedIndex;
        // Cerrado: solo la última (la del frente) muestra su cara completa. Abierto: solo la abierta.
        const isFull = isExpanded ? isSelected : i === lastIndex;
        return (
          <WalletCard
            key={account.id}
            account={account}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            targetY={layout.ys[i]}
            zIndex={isSelected ? count + 2 : i}
            isSelected={isSelected}
            isFull={isFull}
            hideBalance={hideBalances}
            onPress={handleCardPress}
            onDismiss={handleDismiss}
          />
        );
      })}

      {expandedAccount && (
        <Animated.View
          key={expandedAccount.id}
          entering={reduced ? DETAILS_ENTER_REDUCED : DETAILS_ENTER}
          exiting={DETAILS_EXIT}
          style={[
            styles.details,
            { top: layout.detailsY, left: SHADOW_PAD, width: cardWidth, zIndex: count + 1, elevation: count + 1 },
          ]}
        >
          <WalletDetails
            account={expandedAccount}
            onLayout={handleDetailsLayout}
            onViewTransactions={onViewTransactions}
            onManageAccount={onManageAccount}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ─── Detalles secundarios (ocultos hasta abrir la tarjeta) ───

interface WalletDetailsProps {
  account: Account;
  onLayout: (e: LayoutChangeEvent) => void;
  onViewTransactions: (account: Account) => void;
  onManageAccount: (account: Account) => void;
}

function WalletDetails({ account, onLayout, onViewTransactions, onManageAccount }: WalletDetailsProps) {
  const c = useColors();
  const styles2 = useMemo(() => createDetailStyles(c), [c]);

  const items: { label: string; value: string }[] = [
    { label: 'Tipo',   value: ACCOUNT_TYPE_LABELS[account.type] ?? account.type },
    { label: 'Moneda', value: account.currency || 'COP' },
    { label: 'Desde',  value: formatMemberSince(account.createdAt) },
  ];

  return (
    <GlassView weight="regular" style={styles2.glass}>
      <View style={styles2.content} onLayout={onLayout}>
        <View style={styles2.metaRow}>
          {items.map((item) => (
            <View key={item.label} style={styles2.metaItem}>
              <Text style={styles2.metaLabel} maxFontSizeMultiplier={1.3}>{item.label.toUpperCase()}</Text>
              <Text style={styles2.metaValue} numberOfLines={1} maxFontSizeMultiplier={1.3}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles2.divider} />

        <View style={styles2.actions}>
          <AnimatedPressable
            style={[styles2.button, styles2.primary]}
            onPress={() => { hapticSave(); onViewTransactions(account); }}
            accessibilityRole="button"
            accessibilityLabel={`Ver movimientos de ${account.name}`}
          >
            <Text style={styles2.primaryText} maxFontSizeMultiplier={1.3}>Movimientos</Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={[styles2.button, styles2.secondary]}
            onPress={() => { hapticToggle(); onManageAccount(account); }}
            accessibilityRole="button"
            accessibilityLabel={`Gestionar ${account.name}`}
          >
            <Text style={styles2.secondaryText} maxFontSizeMultiplier={1.3}>Gestionar</Text>
          </AnimatedPressable>
        </View>
      </View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  stack: {
    alignSelf: 'center',
    overflow: 'hidden',   // corta el mazo comprimido contra el borde inferior, como Wallet
  },
  details: {
    position: 'absolute',
  },
});

const createDetailStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  glass: {
    borderRadius: 26,
    overflow: 'hidden',   // necesario para que BlurView respete borderRadius
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.borderStrong,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  metaRow: { flexDirection: 'row', gap: spacing.lg },
  metaItem: { flex: 1, gap: 4 },
  metaLabel: { fontSize: 10, fontWeight: '400', letterSpacing: 1, color: c.textSecondary },
  metaValue: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, color: c.textPrimary },
  divider: { height: StyleSheet.hairlineWidth * 2, backgroundColor: c.borderStrong },
  actions: { flexDirection: 'row', gap: spacing.md },
  button: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: c.textPrimary },
  primaryText: { fontSize: 15, fontWeight: '600', color: c.background },
  secondary: { backgroundColor: c.surfaceTertiary },
  secondaryText: { fontSize: 15, fontWeight: '600', color: c.textPrimary },
});
