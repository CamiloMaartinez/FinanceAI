import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';
import { hapticSave, hapticToggle } from '../../utils/haptics';
import { AnimatedPressable } from '../ui/AnimatedPressable';
import type { Account } from '../../models/types';
import { WALLET_REFLOW, WalletStack } from './WalletStack';
import { CARD_ASPECT, MAX_CARD_WIDTH } from './walletLayout';
import { HIDDEN_AMOUNT, walletType } from './walletTheme';

export interface WalletDashboardProps {
  accounts: Account[];
  /** Patrimonio total ya convertido a COP (viene de getTotalBalance). */
  totalBalance: number;
  /** Ingresos − gastos del mes. */
  monthlyNet: number;
  onViewTransactions: (account: Account) => void;
  onManageAccount: (account: Account) => void;
  onAddAccount: () => void;
  onExpandedChange?: (expanded: boolean) => void;
}

/**
 * "La Billetera": saldo total grande arriba, cuentas como mazo de tarjetas
 * debajo. Lo crítico (saldo, entidad) siempre a la vista; el resto de datos
 * aparece al abrir una tarjeta.
 */
export function WalletDashboard({
  accounts, totalBalance, monthlyNet,
  onViewTransactions, onManageAccount, onAddAccount, onExpandedChange,
}: WalletDashboardProps) {
  const c = useColors();
  const s = useMemo(() => createStyles(c), [c]);
  const [hideBalances, setHideBalances] = useState(false);
  const isPositive = monthlyNet >= 0;

  return (
    // layout: si el mazo crece al abrir una tarjeta, esta cabecera no se mueve,
    // pero el contenedor sí cambia de alto — lo animamos para que nada salte.
    <Animated.View layout={WALLET_REFLOW}>
      <View style={s.header}>
        <View style={s.headerTop}>
          <Text style={s.eyebrow}>PATRIMONIO TOTAL</Text>
          <AnimatedPressable
            onPress={() => { hapticToggle(); setHideBalances((v) => !v); }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hideBalances ? 'Mostrar saldos' : 'Ocultar saldos'}
          >
            <Ionicons
              name={hideBalances ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={c.textSecondary}
            />
          </AnimatedPressable>
        </View>

        <Text
          style={s.total}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          maxFontSizeMultiplier={1.2}
        >
          {hideBalances ? HIDDEN_AMOUNT : formatCurrency(totalBalance)}
        </Text>

        <View style={s.flowRow}>
          <Ionicons
            name={isPositive ? 'arrow-up' : 'arrow-down'}
            size={12}
            color={isPositive ? c.income : c.expense}
          />
          <Text style={[s.flow, { color: isPositive ? c.income : c.expense }]}>
            {hideBalances ? HIDDEN_AMOUNT : `${isPositive ? '+' : '-'}${formatCurrency(Math.abs(monthlyNet))}`}
          </Text>
          <Text style={s.flowMeta}>este mes</Text>
        </View>
      </View>

      <View style={s.sectionRow}>
        <Text style={s.eyebrow}>
          CUENTAS{accounts.length > 0 ? ` · ${accounts.length}` : ''}
        </Text>
        <AnimatedPressable
          onPress={() => { hapticSave(); onAddAccount(); }}
          hitSlop={12}
          style={s.addButton}
          accessibilityRole="button"
          accessibilityLabel="Añadir cuenta"
        >
          <Ionicons name="add" size={16} color={c.textPrimary} />
        </AnimatedPressable>
      </View>

      {accounts.length === 0 ? (
        <EmptyWallet onPress={() => { hapticSave(); onAddAccount(); }} />
      ) : (
        <WalletStack
          accounts={accounts}
          hideBalances={hideBalances}
          onViewTransactions={onViewTransactions}
          onManageAccount={onManageAccount}
          onExpandedChange={onExpandedChange}
        />
      )}
    </Animated.View>
  );
}

function EmptyWallet({ onPress }: { onPress: () => void }) {
  const c = useColors();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - spacing.xl * 2, MAX_CARD_WIDTH);
  const cardHeight = Math.round(cardWidth / CARD_ASPECT);

  return (
    <AnimatedPressable
      onPress={onPress}
      pressScale={0.98}
      accessibilityRole="button"
      accessibilityLabel="Añadir tu primera cuenta"
      style={{
        alignSelf: 'center',
        width: cardWidth,
        height: cardHeight,
        borderRadius: 26,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: c.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
      }}
    >
      <Ionicons name="add-circle-outline" size={32} color={c.textSecondary} />
      <Text style={{ fontSize: 15, fontWeight: '600', color: c.textPrimary }}>Añade tu primera cuenta</Text>
      <Text style={{ fontSize: 12, fontWeight: '400', color: c.textSecondary }}>Efectivo, banco, Nequi…</Text>
    </AnimatedPressable>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  header: { paddingTop: spacing.lg, paddingBottom: spacing.xl },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  eyebrow: { ...walletType.eyebrow, color: c.textSecondary },
  total: { ...walletType.totalAmount, color: c.textPrimary },
  flowRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  flow: { fontSize: 14, fontWeight: '600', letterSpacing: -0.1, fontVariant: ['tabular-nums'] },
  flowMeta: { fontSize: 13, fontWeight: '400', color: c.textSecondary, marginLeft: 2 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.surfaceTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
