import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, BackHandler, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import {
  getAccountById,
  getAccountTransactions,
  getAccountFlowsSince,
  getAccountBalanceSeries,
  countAccountTransactions,
  updateAccount,
  setAccountBalance,
  deleteAccount,
  deleteAccountPermanently,
  restoreAccount,
} from '../../src/database/db';
import { AccountCard, ACCOUNT_CARD_HEIGHT } from '../../src/components/AccountCard';
import { AccountForm } from '../../src/components/AccountForm';
import { TransactionRow } from '../../src/components/TransactionRow';
import { CircleAction } from '../../src/components/ui/CircleAction';
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable';
import { Text } from '../../src/components/ui/Text';
import { useColors, fonts, radius, spacing, tabularNums, type ThemeColors } from '../../src/constants/theme';
import { springSheet } from '../../src/constants/motion';
import { ACCOUNT_TYPE_LABELS } from '../../src/constants/accounts';
import { getCurrencyInfo, formatWithCurrency } from '../../src/constants/currencies';
import { useAccessibilityPreferences } from '../../src/hooks/useAccessibilityPreferences';
import { originFromParams } from '../../src/utils/accountNavigation';
import { hapticDelete, hapticToggle } from '../../src/utils/haptics';
import type { Account, TransactionWithCategory } from '../../src/models/types';
import type { AccountFormValues } from '../../src/hooks/useAccounts';

const DETAIL_CARD_HEIGHT = ACCOUNT_CARD_HEIGHT + 16;
const TOP_BAR = 52;

export default function AccountDetailScreen() {
  const params = useLocalSearchParams<{ id: string; ox?: string; oy?: string; ow?: string; oh?: string }>();
  const c = useColors();
  const s = useMemo(() => createStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const { reduceMotion } = useAccessibilityPreferences();

  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [flows, setFlows] = useState({ income: 0, expense: 0 });
  const [series, setSeries] = useState<{ label: string; value: number }[]>([]);
  const [movementCount, setMovementCount] = useState(0);
  const [formVisible, setFormVisible] = useState(false);
  const [chartWidth, setChartWidth] = useState(0);

  const load = useCallback(async () => {
    const acc = await getAccountById(params.id);
    setAccount(acc);
    if (!acc) return;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const [txs, f, ser, count] = await Promise.all([
      getAccountTransactions(acc.id),
      getAccountFlowsSince(acc.id, monthStart),
      getAccountBalanceSeries(acc.id),
      countAccountTransactions(acc.id),
    ]);
    setTransactions(txs);
    setFlows(f);
    setSeries(ser);
    setMovementCount(count);
  }, [params.id]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  // ─── Expansión: la tarjeta crece desde donde estaba hasta el encabezado ───
  const target = { x: spacing.lg, y: insets.top + TOP_BAR, width: screenW - spacing.lg * 2, height: DETAIL_CARD_HEIGHT };
  const origin = originFromParams(params);
  const progress = useSharedValue(reduceMotion || !origin ? 0.999 : 0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    progress.value = reduceMotion
      ? withTiming(1, { duration: 150 })
      : origin ? withSpring(1, springSheet) : withTiming(1, { duration: 220 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escala uniforme (la tarjeta no se deforma); se centra sobre la fila o tarjeta de origen
  const startScale = origin ? origin.width / target.width : 0.92;
  const startX = origin ? origin.x - target.x : (target.width * 0.08) / 2;
  const startY = origin ? origin.y + origin.height / 2 - (target.y + (target.height * startScale) / 2) : 24;

  const cardStyle = useAnimatedStyle(() => ({
    opacity: origin ? 1 : progress.value,
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [startX, 0]) },
      { translateY: interpolate(progress.value, [0, 1], [startY, 0]) },
      { scale: interpolate(progress.value, [0, 1], [startScale, 1]) },
    ],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 0.6], [0, 1], 'clamp') }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.55, 1], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(progress.value, [0.55, 1], [24, 0], 'clamp') }],
  }));

  // Al volver, la tarjeta regresa a su lugar antes de cerrar la pantalla
  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    const done = () => router.back();
    if (reduceMotion) return done();
    progress.value = withTiming(0, { duration: 240 }, (finished) => {
      if (finished) runOnJS(done)();
    });
  }, [closing, reduceMotion, progress]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [close]);

  // ─── Acciones ───
  const handleSave = async (values: AccountFormValues) => {
    if (!account) return;
    await updateAccount(account.id, {
      name: values.name,
      type: values.type,
      colorHex: values.colorHex,
      gradientTo: values.gradientTo,
      iconName: values.iconName,
      currency: values.currency,
    });
    if (values.balance !== account.balance) await setAccountBalance(account.id, values.balance);
    await load();
  };

  const handleArchive = () => {
    if (!account) return;
    hapticToggle();
    if (!account.isActive) {
      restoreAccount(account.id).then(load);
      return;
    }
    Alert.alert('Archivar cuenta', `"${account.name}" dejará de aparecer en tus cuentas y en el saldo total. Sus movimientos se conservan.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Archivar', onPress: async () => { await deleteAccount(account.id); close(); } },
    ]);
  };

  const handleDelete = () => {
    if (!account) return;
    hapticDelete();
    if (movementCount > 0) {
      Alert.alert('No se puede eliminar', 'Esta cuenta tiene movimientos. Archívala para ocultarla sin perder el historial.');
      return;
    }
    Alert.alert('Eliminar cuenta', `¿Eliminar "${account.name}" para siempre? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccountPermanently(account.id);
            close();
          } catch (e) {
            Alert.alert('No se pudo eliminar', e instanceof Error ? e.message : '');
          }
        },
      },
    ]);
  };

  const handleTransfer = () => {
    if (!account) return;
    router.navigate({ pathname: '/transactions', params: { nuevo: 'transferencia', cuenta: account.id } });
  };

  const values = series.map((p) => p.value);
  const min = values.length ? Math.min(...values) : 0;
  const range = Math.max((values.length ? Math.max(...values) : 0) - min, 1);

  return (
    <View style={s.root}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.background }, backdropStyle]} />

      {/* Barra superior */}
      <Animated.View style={[s.topBar, { top: insets.top }, contentStyle]}>
        <AnimatedPressable
          style={s.back}
          onPress={close}
          onPressFeedback={hapticToggle}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="chevron-back" size={20} color={c.textPrimary} />
        </AnimatedPressable>
        <Text style={s.topTitle} accessibilityRole="header">Detalle de la cuenta</Text>
        <View style={s.back} />
      </Animated.View>

      <Animated.ScrollView
        style={StyleSheet.absoluteFill}
        contentContainerStyle={{ paddingTop: target.y + target.height + spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[s.body, contentStyle]}>
          {account && (
            <>
              {!account.isActive && (
                <View style={s.archived}>
                  <Ionicons name="archive-outline" size={16} color={c.textSecondary} />
                  <Text style={s.archivedText}>Cuenta archivada: no suma al saldo total</Text>
                </View>
              )}

              <View style={s.actions}>
                <CircleAction icon="create-outline" label="Editar" onPress={() => setFormVisible(true)} />
                <CircleAction icon="swap-horizontal" label="Transferir" onPress={handleTransfer} disabled={!account.isActive} />
                <CircleAction
                  icon={account.isActive ? 'archive-outline' : 'arrow-undo-outline'}
                  label={account.isActive ? 'Archivar' : 'Restaurar'}
                  onPress={handleArchive}
                />
                <CircleAction icon="trash-outline" label="Eliminar" onPress={handleDelete} />
              </View>

              <View style={s.card}>
                <InfoRow label="Saldo" value={formatWithCurrency(account.balance, account.currency)} s={s} strong />
                <InfoRow label="Moneda" value={`${getCurrencyInfo(account.currency).name} (${account.currency})`} s={s} />
                <InfoRow label="Tipo" value={ACCOUNT_TYPE_LABELS[account.type] ?? account.type} s={s} />
                <InfoRow
                  label="Creada"
                  value={new Date(account.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                  s={s}
                  last
                />
              </View>

              <View style={s.flows}>
                <View style={[s.flowBox, { backgroundColor: c.surface }]}>
                  <Text style={s.flowLabel}>Entró este mes</Text>
                  <Text style={[s.flowValue, { color: c.income }]}>+{formatWithCurrency(flows.income, account.currency)}</Text>
                </View>
                <View style={[s.flowBox, { backgroundColor: c.surface }]}>
                  <Text style={s.flowLabel}>Salió este mes</Text>
                  <Text style={[s.flowValue, { color: c.expense }]}>−{formatWithCurrency(flows.expense, account.currency)}</Text>
                </View>
              </View>

              <View style={s.card}>
                <Text style={s.section}>Saldo en los últimos 30 días</Text>
                <View
                  style={s.chart}
                  onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
                  accessible
                  accessibilityRole="image"
                  accessibilityLabel={
                    series.length >= 2
                      ? `Saldo de ${formatWithCurrency(series[0].value, account.currency)} hace 30 días a ${formatWithCurrency(account.balance, account.currency)} hoy`
                      : 'Sin datos suficientes'
                  }
                >
                  {chartWidth > 0 && series.length >= 2 && (
                    <LineChart
                      data={series.map((p) => ({ value: p.value - min + range * 0.1 }))}
                      width={chartWidth}
                      height={80}
                      spacing={chartWidth / (series.length - 1)}
                      initialSpacing={0}
                      endSpacing={0}
                      curved
                      areaChart
                      color={c.accent}
                      startFillColor={c.accent}
                      endFillColor={c.surface}
                      startOpacity={0.2}
                      endOpacity={0}
                      thickness={2.5}
                      hideDataPoints
                      hideRules
                      hideYAxisText
                      hideAxesAndRules
                      yAxisLabelWidth={0}
                      xAxisLabelsHeight={0}
                      maxValue={range * 1.25}
                      disableScroll
                      isAnimated={!reduceMotion}
                    />
                  )}
                </View>
              </View>

              <Text style={[s.section, s.movementsTitle]}>Movimientos</Text>
              {transactions.length === 0 ? (
                <Text style={s.empty}>Esta cuenta aún no tiene movimientos.</Text>
              ) : (
                <View style={s.card}>
                  {transactions.map((tx) => <TransactionRow key={tx.id} transaction={tx} />)}
                </View>
              )}
            </>
          )}
          {!account && <Text style={s.empty}>Cargando…</Text>}
        </Animated.View>
      </Animated.ScrollView>

      {/* La tarjeta va encima de todo para que la expansión no quede tapada */}
      {account && (
        <Animated.View
          pointerEvents="box-none"
          style={[s.cardHost, { left: target.x, top: target.y, width: target.width, transformOrigin: 'top left' }, cardStyle]}
        >
          <AccountCard account={account} still height={target.height} />
        </Animated.View>
      )}

      <AccountForm
        visible={formVisible}
        initial={account}
        hasMovements={movementCount > 0}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
      />
    </View>
  );
}

function InfoRow({ label, value, s, strong, last }: {
  label: string; value: string; s: ReturnType<typeof createStyles>; strong?: boolean; last?: boolean;
}) {
  return (
    <View style={[s.infoRow, !last && s.infoBorder]} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, strong && s.infoStrong]}>{value}</Text>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1 },
    topBar: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      height: TOP_BAR,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 2,
    },
    back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface },
    topTitle: { fontFamily: fonts.semibold, fontSize: 16, color: c.textPrimary },
    cardHost: { position: 'absolute', zIndex: 3 },
    body: { paddingHorizontal: spacing.lg },
    archived: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md,
    },
    archivedText: { fontFamily: fonts.medium, fontSize: 13, color: c.textSecondary },
    actions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.xl },
    card: { backgroundColor: c.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, gap: spacing.md },
    infoBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderStrong },
    infoLabel: { fontFamily: fonts.medium, fontSize: 14, color: c.textSecondary },
    infoValue: { fontFamily: fonts.semibold, fontSize: 14, color: c.textPrimary, flexShrink: 1, textAlign: 'right', ...tabularNums },
    infoStrong: { fontFamily: fonts.bold, fontSize: 16 },
    flows: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
    flowBox: { flex: 1, borderRadius: radius.xl, padding: spacing.lg },
    flowLabel: { fontFamily: fonts.medium, fontSize: 12, color: c.textSecondary, marginBottom: 4 },
    flowValue: { fontFamily: fonts.bold, fontSize: 16, ...tabularNums },
    section: { fontFamily: fonts.bold, fontSize: 16, color: c.textPrimary, marginBottom: spacing.sm },
    movementsTitle: { marginTop: spacing.md },
    chart: { height: 80 },
    empty: { fontFamily: fonts.regular, fontSize: 14, color: c.textSecondary, paddingVertical: spacing.lg, textAlign: 'center' },
  });
}
