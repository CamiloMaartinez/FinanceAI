import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useDashboard } from '../../src/hooks/useDashboard';
import { useAccounts } from '../../src/hooks/useAccounts';
import { NetWorthChart } from '../../src/components/dashboard/NetWorthChart';
import { MonthlyBarChart } from '../../src/components/dashboard/MonthlyBarChart';
import { AssetRow } from '../../src/components/dashboard/AssetRow';
import { AnimatedAmount } from '../../src/components/ui/AnimatedAmount';
import { AmountText } from '../../src/components/ui/AmountText';
import { PullCoin } from '../../src/components/dashboard/PullCoin';
import { usePullToRefresh } from '../../src/hooks/usePullToRefresh';
import { CircleAction } from '../../src/components/ui/CircleAction';
import { BottomSheetCard } from '../../src/components/ui/BottomSheetCard';
import { IconBadge } from '../../src/components/ui/IconBadge';
import { CategoryBadge } from '../../src/components/icons/CategoryBadge';
import { Avatar } from '../../src/components/ui/Avatar';
import { useActiveProfile } from '../../src/hooks/useActiveProfile';
import { openAccountDetail } from '../../src/utils/accountNavigation';
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable';
import { Text } from '../../src/components/ui/Text';
import { useColors, spacing, radius, fonts, pastels, type ThemeColors } from '../../src/constants/theme';
import { TAB_BAR_HEIGHT } from '../../src/constants/layout';
import { ACCOUNT_TYPE_LABELS } from '../../src/constants/accounts';
import { formatWithCurrency } from '../../src/constants/currencies';
import { useTheme } from '../../src/context/ThemeContext';
import { formatCurrency, formatDate, getGreeting } from '../../src/utils/currency';
import { hapticToggle } from '../../src/utils/haptics';
import type { Account, TransactionWithCategory } from '../../src/models/types';

const HIDDEN = '••••';
/** Alto de la barra compacta (sin contar la barra de estado). */
const COMPACT_BAR = 48;
const REFRESH_ACTIONS = [{ name: 'refresh', label: 'Actualizar' }];

/** Variación del mes de una cuenta: porcentaje si hay base, monto si no. */
function accountChangeLabel(account: Account, change: number | undefined): { text: string; positive: boolean | null } {
  if (!change) return { text: 'Sin cambios este mes', positive: null };
  const base = account.balance - change;
  const sign = change > 0 ? '+' : '−';
  if (base > 0) {
    return { text: `${sign}${Math.abs((change / base) * 100).toFixed(1).replace('.', ',')} %`, positive: change > 0 };
  }
  return { text: `${sign}${formatWithCurrency(Math.abs(change), account.currency)}`, positive: change > 0 };
}

export default function DashboardScreen() {
  const dashboard = useDashboard();
  const accountsState = useAccounts();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const s = useMemo(() => createStyles(c), [c]);
  const { isDark } = useTheme();
  const [hideBalances, setHideBalances] = useState(false);
  const active = useActiveProfile();

  const refreshAll = useCallback(async () => {
    await Promise.all([dashboard.refresh(), accountsState.refresh()]);
  }, [dashboard.refresh, accountsState.refresh]);

  // Un solo scroll alimenta el encabezado compacto (A5) y la moneda (B9)
  const scrollY = useSharedValue(0);
  const pullToRefresh = usePullToRefresh(refreshAll, scrollY);
  const onRelease = pullToRefresh.onRelease;
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
    onEndDrag: (e) => {
      onRelease(e.contentOffset.y);
    },
  });
  const nativeScroll = useMemo(() => Gesture.Native(), []);
  const scrollGesture = Gesture.Simultaneous(pullToRefresh.pan, nativeScroll);

  // Scroll en el que el saldo grande queda debajo de la barra compacta. Se
  // mide con onLayout; el valor inicial solo vale hasta la primera medida.
  const compactHeight = insets.top + COMPACT_BAR;
  const compactAt = useSharedValue(240);
  const [compactShown, setCompactShown] = useState(false);
  useAnimatedReaction(
    () => scrollY.value > compactAt.value - 12,
    (shown, wasShown) => {
      if (shown !== wasShown) scheduleOnRN(setCompactShown, shown);
    },
  );
  const bigBalanceStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [compactAt.value - 48, compactAt.value - 8], [1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(scrollY.value, [0, compactAt.value], [1, 0.85], Extrapolation.CLAMP) }],
  }));
  const compactStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [compactAt.value - 24, compactAt.value], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [compactAt.value - 24, compactAt.value], [-6, 0], Extrapolation.CLAMP) }],
  }));

  // Al volver a Inicio (después de registrar un movimiento o editar una cuenta)
  // los datos se recargan sin tener que deslizar hacia abajo
  const isFirstFocus = useRef(true);
  useFocusEffect(useCallback(() => {
    if (isFirstFocus.current) {
      isFirstFocus.current = false;
      return;
    }
    refreshAll().catch(() => {});
  }, [refreshAll]));

  const openNew = (nuevo: 'ingreso' | 'gasto' | 'transferencia') =>
    router.navigate({ pathname: '/transactions', params: { nuevo } });

  if (dashboard.isLoading && accountsState.isLoading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="small" color={c.textTertiary} />
      </View>
    );
  }

  const net = dashboard.monthlyNet;
  const accounts = accountsState.accounts;

  return (
    <View style={s.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.hero} />
      <GestureDetector gesture={scrollGesture}>
        <Animated.ScrollView
          entering={FadeIn.duration(300)}
          style={s.scroll}
          contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + spacing.xl }}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          // Android no rebota: el jalón lo toma el gesto del pull-to-refresh
          overScrollMode="never"
        >
          <Animated.View style={pullToRefresh.contentStyle}>
            {/* Al estirar hacia abajo se ve lavanda, no el color de la hoja */}
            <View style={s.overscroll} />

            <View style={[s.hero, { paddingTop: insets.top + spacing.sm }]}>
              <View style={s.topBar}>
                <AnimatedPressable
                  style={s.roundButton}
                  onPress={() => router.navigate('/more')}
                  onPressFeedback={hapticToggle}
                  accessibilityRole="button"
                  accessibilityLabel="Abrir el menú de módulos"
                >
                  <Ionicons name="grid-outline" size={20} color={c.heroText} />
                </AnimatedPressable>
                <Text style={s.greeting}>{getGreeting()}</Text>
                <AnimatedPressable
                  onPress={() => router.navigate('/profile')}
                  onPressFeedback={hapticToggle}
                  accessibilityRole="button"
                  accessibilityLabel="Abrir tu perfil"
                >
                  <Avatar profile={active.profile} name={active.displayName} size={40} style={s.avatar} />
                </AnimatedPressable>
              </View>

              <View style={s.balanceLabelRow}>
                <Text style={s.balanceLabel}>Mi saldo</Text>
                <AnimatedPressable
                  onPress={() => setHideBalances((v) => !v)}
                  onPressFeedback={hapticToggle}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={hideBalances ? 'Mostrar saldos' : 'Ocultar saldos'}
                >
                  <Ionicons name={hideBalances ? 'eye-off-outline' : 'eye-outline'} size={18} color={c.heroTextSecondary} />
                </AnimatedPressable>
              </View>

              <Animated.View
                style={[s.bigBalance, bigBalanceStyle]}
                onLayout={(e) => {
                  const { y, height } = e.nativeEvent.layout;
                  compactAt.value = y + height - compactHeight;
                }}
              >
                {hideBalances ? (
                  <Text
                    style={s.hiddenBalance}
                    accessibilityLabel="Saldo oculto"
                    accessibilityActions={REFRESH_ACTIONS}
                    onAccessibilityAction={(e) => e.nativeEvent.actionName === 'refresh' && pullToRefresh.refresh()}
                  >
                    {HIDDEN}
                  </Text>
                ) : (
                  <AnimatedAmount
                    value={dashboard.totalBalance}
                    size={44}
                    color={c.heroText}
                    mutedColor={c.heroTextSecondary}
                    testID="saldo-total"
                    // Sin gesto para jalar, el lector de pantalla recarga desde aquí
                    accessibilityActions={REFRESH_ACTIONS}
                    onAccessibilityAction={(e) => e.nativeEvent.actionName === 'refresh' && pullToRefresh.refresh()}
                  />
                )}
              </Animated.View>

              <Text style={s.monthNet}>
                {hideBalances ? HIDDEN : `${net >= 0 ? '+' : '−'}${formatCurrency(Math.abs(net))}`} este mes
              </Text>

              <View style={s.actions}>
                <CircleAction icon="arrow-down" label="Ingreso" labelColor={c.heroText} onPress={() => openNew('ingreso')} />
                <CircleAction icon="arrow-up" label="Gasto" labelColor={c.heroText} onPress={() => openNew('gasto')} />
                <CircleAction
                  icon="swap-horizontal"
                  label="Transferir"
                  labelColor={c.heroText}
                  disabled={accounts.length < 2}
                  onPress={() => openNew('transferencia')}
                />
              </View>

              <NetWorthChart
                data={dashboard.netWorthHistory}
                period={dashboard.netWorthPeriod}
                onPeriodChange={dashboard.setNetWorthPeriod}
                hidden={hideBalances}
              />
            </View>

            <BottomSheetCard style={s.sheet}>
              {dashboard.error && <Text style={s.error}>{dashboard.error}</Text>}

              <SectionHeader
                title="Mis cuentas"
                actionLabel="Añadir"
                actionA11y="Añadir cuenta"
                onAction={() => router.navigate('/accounts')}
                s={s}
              />
              {accounts.length === 0 ? (
                <AnimatedPressable
                  style={s.emptyCard}
                  onPress={() => router.navigate('/accounts')}
                  onPressFeedback={hapticToggle}
                  accessibilityRole="button"
                  accessibilityLabel="Añadir tu primera cuenta"
                >
                  <IconBadge icon="add" color={pastels.lavender} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.emptyTitle}>Añade tu primera cuenta</Text>
                    <Text style={s.emptyText}>Efectivo, banco, Nequi…</Text>
                  </View>
                </AnimatedPressable>
              ) : (
                accounts.map((account, i) => {
                  const ch = accountChangeLabel(account, dashboard.accountChanges[account.id]);
                  return (
                    <AssetRow
                      key={account.id}
                      index={i}
                      badge={<CategoryBadge iconName={account.iconName} colorHex={account.colorHex} />}
                      title={account.name}
                      detail={`${ACCOUNT_TYPE_LABELS[account.type] ?? account.type} · ${account.currency}`}
                      amount={hideBalances ? HIDDEN : formatWithCurrency(account.balance, account.currency)}
                      change={hideBalances ? undefined : ch.text}
                      changeColor={ch.positive == null ? c.textSecondary : ch.positive ? c.income : c.expense}
                      onPress={(origin) => openAccountDetail(account.id, origin)}
                    />
                  );
                })
              )}

              <View style={s.sectionGap} />
              <SectionHeader
                title="Movimientos recientes"
                actionLabel="Ver todo"
                actionA11y="Ver todos los movimientos"
                onAction={() => router.navigate('/transactions')}
                s={s}
              />
              {dashboard.recentTransactions.length === 0 ? (
                <Text style={s.emptyText}>Sin movimientos registrados</Text>
              ) : (
                dashboard.recentTransactions.map((tx, i) => (
                  <TransactionAssetRow key={tx.id} tx={tx} index={i} hidden={hideBalances} c={c} />
                ))
              )}

              {dashboard.monthlyChart.length > 0 && (
                <>
                  <View style={s.sectionGap} />
                  <MonthlyBarChart data={dashboard.monthlyChart} />
                </>
              )}
            </BottomSheetCard>
          </Animated.View>
        </Animated.ScrollView>
      </GestureDetector>

      {/* Encabezado compacto: el saldo se fija arriba al bajar (A5) */}
      <Animated.View
        pointerEvents="none"
        testID="encabezado-compacto"
        accessibilityElementsHidden={!compactShown}
        importantForAccessibility={compactShown ? 'auto' : 'no-hide-descendants'}
        style={[s.compact, { paddingTop: insets.top, height: compactHeight }, compactStyle]}
      >
        <Text style={s.compactLabel} accessibilityRole="header">Mi saldo</Text>
        {hideBalances ? (
          <Text style={s.compactHidden}>{HIDDEN}</Text>
        ) : (
          <AmountText value={dashboard.totalBalance} size={17} color={c.heroText} mutedColor={c.heroTextSecondary} />
        )}
      </Animated.View>

      <PullCoin {...pullToRefresh.coin} top={insets.top} />
    </View>
  );
}

function TransactionAssetRow({ tx, index, hidden, c }: {
  tx: TransactionWithCategory; index: number; hidden: boolean; c: ThemeColors;
}) {
  const isIncome = tx.type === 'income' || tx.type === 'loan' || tx.type === 'debt_in';
  const isTransfer = tx.type === 'transfer';
  const neutral = isTransfer || tx.type === 'debt_in' || tx.type === 'debt_out';
  const color = tx.categoryColor ?? c.blue;
  const title = tx.notes || tx.categoryName || (isTransfer ? 'Transferencia' : 'Movimiento');

  return (
    <AssetRow
      index={index}
      badge={
        isTransfer
          ? <IconBadge icon="swap-horizontal" color={pastels.sky} />
          : <CategoryBadge iconName={tx.categoryIcon ?? 'otros'} colorHex={color} />
      }
      title={title}
      detail={[tx.categoryName && tx.categoryName !== title ? tx.categoryName : null, tx.accountName].filter(Boolean).join(' · ')}
      amount={hidden ? HIDDEN : `${isTransfer ? '' : isIncome ? '+' : '−'}${formatCurrency(tx.amount)}`}
      amountColor={neutral ? c.textPrimary : isIncome ? c.income : c.expense}
      change={formatDate(tx.date)}
    />
  );
}

function SectionHeader({ title, actionLabel, actionA11y, onAction, s }: {
  title: string; actionLabel: string; actionA11y: string; onAction: () => void; s: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle} accessibilityRole="header">{title}</Text>
      <AnimatedPressable
        onPress={onAction}
        onPressFeedback={hapticToggle}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={actionA11y}
      >
        <Text style={s.sectionAction}>{actionLabel}</Text>
      </AnimatedPressable>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    loading: { flex: 1, backgroundColor: c.hero, alignItems: 'center', justifyContent: 'center' },
    container: { flex: 1, backgroundColor: c.hero },
    scroll: { flex: 1, backgroundColor: c.sheet },
    overscroll: { position: 'absolute', top: -1000, left: 0, right: 0, height: 1000, backgroundColor: c.hero },
    hero: {
      backgroundColor: c.hero,
      paddingHorizontal: spacing.xl,
      // La hoja se monta encima: dejamos el espacio de su esquina redondeada
      paddingBottom: radius.sheet + spacing.lg,
    },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
    roundButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.sheet + '59',
      alignItems: 'center',
      justifyContent: 'center',
    },
    greeting: { fontFamily: fonts.medium, fontSize: 14, color: c.heroTextSecondary },
    avatar: { borderWidth: 2, borderColor: c.sheet },
    balanceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
    balanceLabel: { fontFamily: fonts.medium, fontSize: 15, color: c.heroTextSecondary },
    bigBalance: { alignSelf: 'flex-start', transformOrigin: 'left center' },
    compact: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: c.hero,
    },
    compactLabel: { fontFamily: fonts.medium, fontSize: 13, color: c.heroTextSecondary },
    compactHidden: { fontFamily: fonts.extrabold, fontSize: 17, color: c.heroText },
    hiddenBalance: { fontFamily: fonts.extrabold, fontSize: 44, lineHeight: 50, color: c.heroText },
    monthNet: { fontFamily: fonts.medium, fontSize: 13, color: c.heroTextSecondary, marginTop: 2 },
    actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
    sheet: { marginTop: -radius.sheet, minHeight: 480 },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    sectionTitle: { fontFamily: fonts.bold, fontSize: 18, color: c.textPrimary },
    sectionAction: { fontFamily: fonts.semibold, fontSize: 14, color: c.accent },
    sectionGap: { height: spacing.lg },
    emptyCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    emptyTitle: { fontFamily: fonts.semibold, fontSize: 15, color: c.textPrimary },
    emptyText: { fontFamily: fonts.regular, fontSize: 13, color: c.textSecondary, paddingVertical: spacing.xs },
    error: { fontFamily: fonts.medium, fontSize: 13, color: c.expense, marginBottom: spacing.md },
  });
}
