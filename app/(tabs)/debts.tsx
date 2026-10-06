import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useDebts } from '../../src/hooks/useDebts';
import { DebtForm, DebtPaymentForm } from '../../src/components/DebtForms';
import { useColors, spacing, typography, radius, fonts } from '../../src/constants/theme';
import { TAB_BAR_HEIGHT } from '../../src/constants/layout';
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable';
import { BackButton } from '../../src/components/ui/BackButton';
import { hapticSave, hapticToggle } from '../../src/utils/haptics';
import { formatCurrency } from '../../src/utils/currency';
import type { Debt } from '../../src/models/types';

const DAY_MS = 24 * 60 * 60 * 1000;

function dueLabel(debt: Debt): { text: string; overdue: boolean } | null {
  if (!debt.dueDate || debt.isSettled) return null;
  const due = new Date(debt.dueDate);
  const startToday = new Date(new Date().toDateString()).getTime();
  const days = Math.round((new Date(due.toDateString()).getTime() - startToday) / DAY_MS);
  if (days < 0) return { text: `Venció hace ${-days} día${days === -1 ? '' : 's'}`, overdue: true };
  if (days === 0) return { text: 'Vence hoy', overdue: true };
  if (days === 1) return { text: 'Vence mañana', overdue: false };
  return { text: `Vence el ${due.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`, overdue: false };
}

function DebtCard({ debt, onPay, onDelete }: { debt: Debt; onPay: () => void; onDelete: () => void }) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const owedToMe = debt.direction === 'owed_to_me';
  const color = owedToMe ? c.income : c.expense;
  const paidPercent = debt.amount > 0 ? Math.min((debt.paidAmount / debt.amount) * 100, 100) : 0;
  const due = dueLabel(debt);

  return (
    <AnimatedPressable style={[styles.card, debt.isSettled && styles.cardSettled]} onLongPress={onDelete}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
          <Ionicons name={owedToMe ? 'arrow-down' : 'arrow-up'} size={16} color={color} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{debt.personName}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {owedToMe ? 'Te debe' : 'Le debes'}{debt.notes ? ` · ${debt.notes}` : ''}
          </Text>
        </View>
        <View style={styles.amountBlock}>
          <Text style={[styles.remaining, { color: debt.isSettled ? c.textTertiary : color }]}>
            {formatCurrency(debt.remaining)}
          </Text>
          <Text style={styles.ofTotal}>de {formatCurrency(debt.amount)}</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${paidPercent}%`, backgroundColor: color }]} />
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.footerText, due?.overdue && { color: c.expense, fontWeight: '600' }]}>
          {debt.isSettled ? 'Saldada' : due?.text ?? 'Sin fecha límite'}
        </Text>
        {!debt.isSettled && (
          <AnimatedPressable style={styles.payButton} onPress={onPay} onPressFeedback={hapticToggle}>
            <Text style={styles.payButtonText}>Registrar abono</Text>
          </AnimatedPressable>
        )}
      </View>
    </AnimatedPressable>
  );
}

export default function DebtsScreen() {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const data = useDebts();
  const [formVisible, setFormVisible] = useState(false);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);

  const open = data.debts.filter((d) => !d.isSettled);
  const settled = data.debts.filter((d) => d.isSettled);

  const handleDelete = (debt: Debt) => {
    Alert.alert(
      `Eliminar deuda con ${debt.personName}`,
      'Se borran también sus abonos y los movimientos que generaron en tus cuentas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => data.removeDebt(debt) },
      ]
    );
  };

  const handlePay = async (amount: number, date: string, accountId: string | null) => {
    if (!payingDebt) return;
    const settledNow = await data.addPayment(payingDebt, amount, date, accountId);
    hapticSave();
    if (settledNow) Alert.alert('Deuda saldada', `La deuda con ${payingDebt.personName} quedó en cero.`);
  };

  if (data.isLoading && data.debts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={c.textTertiary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView
        entering={FadeIn.duration(350)}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={data.isLoading} onRefresh={data.refresh} tintColor={c.textTertiary} />}
      >
        <View style={styles.header}>
          <BackButton />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>DEUDAS Y PRÉSTAMOS</Text>
            <Text style={styles.count}>{open.length} abierta{open.length !== 1 ? 's' : ''}</Text>
          </View>
          <AnimatedPressable
            style={styles.addButton}
            onPress={() => setFormVisible(true)}
            onPressFeedback={hapticSave}
            accessibilityRole="button"
            accessibilityLabel="Nueva deuda"
          >
            <Ionicons name="add" size={20} color={c.onAccent} />
          </AnimatedPressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.totalsRow}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Te deben</Text>
            <Text style={[styles.totalValue, { color: c.income }]}>{formatCurrency(data.totals.owedToMe)}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Debes</Text>
            <Text style={[styles.totalValue, { color: c.expense }]}>{formatCurrency(data.totals.iOwe)}</Text>
          </View>
        </View>

        {data.debts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color={c.textTertiary} />
            <Text style={styles.emptyTitle}>Sin deudas registradas</Text>
            <Text style={styles.emptySubtitle}>
              Anota lo que prestas y lo que te prestan, con abonos y fecha límite
            </Text>
            <AnimatedPressable style={styles.emptyButton} onPress={() => setFormVisible(true)} onPressFeedback={hapticSave}>
              <Text style={styles.emptyButtonText}>+ Registrar deuda</Text>
            </AnimatedPressable>
          </View>
        ) : (
          <>
            {open.map((debt, i) => (
              <Animated.View key={debt.id} entering={FadeInDown.duration(300).delay(i * 60)}>
                <DebtCard debt={debt} onPay={() => setPayingDebt(debt)} onDelete={() => handleDelete(debt)} />
              </Animated.View>
            ))}
            {settled.length > 0 && <Text style={styles.sectionTitle}>SALDADAS</Text>}
            {settled.map((debt) => (
              <DebtCard key={debt.id} debt={debt} onPay={() => {}} onDelete={() => handleDelete(debt)} />
            ))}
            <Text style={styles.hint}>Mantén presionada una deuda para eliminarla</Text>
          </>
        )}
      </Animated.ScrollView>

      <DebtForm
        visible={formVisible}
        accounts={data.accounts}
        onClose={() => setFormVisible(false)}
        onSave={(input) => { data.addDebt(input); hapticSave(); }}
      />
      <DebtPaymentForm
        debt={payingDebt}
        accounts={data.accounts}
        onClose={() => setPayingDebt(null)}
        onSave={handlePay}
      />
    </SafeAreaView>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: TAB_BAR_HEIGHT + spacing.xl },
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  label: { fontFamily: fonts.medium, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: c.textSecondary, marginBottom: 2 },
  count: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6, color: c.textPrimary },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  divider: { height: spacing.sm },
  totalsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  totalBox: { flex: 1, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.lg },
  totalLabel: { fontSize: 12, color: c.textTertiary, marginBottom: spacing.xs },
  totalValue: { fontSize: 20, fontWeight: '600', letterSpacing: -0.3 },
  sectionTitle: { ...typography.label, color: c.textTertiary, marginTop: spacing.lg, marginBottom: spacing.md },
  empty: { paddingVertical: spacing.xxl * 2, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '300', color: c.textPrimary, marginTop: spacing.md },
  emptySubtitle: { fontSize: 13, fontWeight: '300', color: c.textTertiary, textAlign: 'center', paddingHorizontal: spacing.lg },
  emptyButton: {
    marginTop: spacing.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl,
    borderWidth: 0.5, borderColor: c.borderStrong, borderRadius: 6,
  },
  emptyButtonText: { fontSize: 13, fontWeight: '300', color: c.textPrimary, letterSpacing: 0.3 },
  hint: { fontSize: 11, color: c.textTertiary, textAlign: 'center', marginTop: spacing.xl, letterSpacing: 0.3 },
  card: { backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.md },
  cardSettled: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: c.textPrimary },
  cardSubtitle: { fontSize: 12, color: c.textTertiary, marginTop: 2 },
  amountBlock: { alignItems: 'flex-end' },
  remaining: { fontSize: 16, fontWeight: '700' },
  ofTotal: { fontSize: 11, color: c.textTertiary, marginTop: 2 },
  progressTrack: { height: 6, backgroundColor: c.surfaceSecondary, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerText: { fontSize: 12, color: c.textSecondary },
  payButton: { paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: c.accent + '1F' },
  payButtonText: { fontSize: 13, fontWeight: '600', color: c.accent },
});
