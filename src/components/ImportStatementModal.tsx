import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, radius } from '../constants/theme';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { hapticSave, hapticToggle } from '../utils/haptics';
import { formatCurrency, formatDate } from '../utils/currency';
import {
  parseBankStatement, findDuplicates, suggestCategoryFromHistory, type ColumnMapping,
} from '../utils/csvImport';
import { pickStatementFile } from '../services/statementImport';
import { getAllAccounts, getAllTransactionsWithCategory, importTransactions } from '../database/db';
import type { Account, TransactionWithCategory } from '../models/types';

interface ImportStatementModalProps {
  visible: boolean;
  onClose: () => void;
}

type ManualField = 'date' | 'description' | 'amount';
const FIELD_LABELS: Record<ManualField, string> = { date: 'Fecha', description: 'Descripción', amount: 'Monto (con signo)' };

// Importa un extracto bancario en CSV: elegir archivo → revisar (cuenta,
// duplicados, qué filas) → importar todo de una vez.
export function ImportStatementModal({ visible, onClose }: ImportStatementModalProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [existing, setExisting] = useState<TransactionWithCategory[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [manual, setManual] = useState<Partial<Record<ManualField, number>>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    Promise.all([getAllAccounts(), getAllTransactionsWithCategory()]).then(([a, t]) => {
      setAccounts(a);
      setExisting(t);
      setAccountId((prev) => prev ?? a[0]?.id ?? null);
    });
  }, [visible]);

  const manualMapping: ColumnMapping | undefined =
    manual.date !== undefined && manual.description !== undefined && manual.amount !== undefined
      ? { date: manual.date, description: manual.description, amount: manual.amount, debit: null, credit: null, kind: null }
      : undefined;

  const parsed = useMemo(
    () => (file ? parseBankStatement(file.text, manualMapping) : null),
    [file, manualMapping?.date, manualMapping?.description, manualMapping?.amount]
  );

  const duplicates = useMemo(
    () => (parsed && accountId ? findDuplicates(parsed.rows, existing, accountId) : new Set<number>()),
    [parsed, existing, accountId]
  );

  // Por defecto: todo seleccionado menos los duplicados
  useEffect(() => {
    if (!parsed) return;
    setSelected(new Set(parsed.rows.map((_, i) => i).filter((i) => !duplicates.has(i))));
  }, [parsed, duplicates]);

  const reset = () => {
    setFile(null); setManual({}); setSelected(new Set()); setIsImporting(false);
  };
  const handleClose = () => { reset(); onClose(); };

  const handlePick = async () => {
    try {
      const picked = await pickStatementFile();
      if (picked) { setManual({}); setFile(picked); }
    } catch (err) {
      Alert.alert('No se pudo abrir el archivo', err instanceof Error ? err.message : 'Inténtalo de nuevo');
    }
  };

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const chosen = parsed ? parsed.rows.filter((_, i) => selected.has(i)) : [];
  const incomeTotal = chosen.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const expenseTotal = chosen.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0);

  const handleImport = async () => {
    if (!accountId || chosen.length === 0) return;
    setIsImporting(true);
    try {
      const count = await importTransactions(chosen.map((row) => ({
        amount: row.amount,
        type: row.type,
        date: row.date,
        accountId,
        toAccountId: null,
        categoryId: row.type === 'expense' ? suggestCategoryFromHistory(row.description, existing) : null,
        notes: row.description,
      })));
      hapticSave();
      Alert.alert(
        'Extracto importado',
        `Se agregaron ${count} movimientos. Los gastos sin categoría puedes completarlos desde Movimientos.`
      );
      handleClose();
    } catch (err) {
      setIsImporting(false);
      Alert.alert('No se importó nada', err instanceof Error ? err.message : 'Inténtalo de nuevo');
    }
  };

  const canImport = !!accountId && chosen.length > 0 && !isImporting;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <AnimatedPressable onPress={handleClose}>
            <Text style={styles.cancelBtn}>Cancelar</Text>
          </AnimatedPressable>
          <Text style={styles.headerTitle}>Importar extracto</Text>
          {isImporting ? (
            <ActivityIndicator size="small" color={c.textTertiary} />
          ) : (
            <AnimatedPressable onPress={handleImport} disabled={!canImport} onPressFeedback={hapticSave}>
              <Text style={[styles.saveBtn, !canImport && styles.disabled]}>Importar</Text>
            </AnimatedPressable>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {!file ? (
            <View style={styles.intro}>
              <Ionicons name="document-text-outline" size={36} color={c.textTertiary} />
              <Text style={styles.introTitle}>Trae los movimientos de tu banco</Text>
              <Text style={styles.introText}>
                Descarga el extracto en formato CSV desde la web o la app de tu banco y elígelo aquí.
                Antes de importar podrás revisar cada movimiento; los que ya tengas registrados se marcan como duplicados.
              </Text>
              <AnimatedPressable style={styles.pickButton} onPress={handlePick} onPressFeedback={hapticToggle}>
                <Text style={styles.pickButtonText}>Elegir archivo CSV</Text>
              </AnimatedPressable>
            </View>
          ) : (
            <>
              <View style={styles.fileRow}>
                <Ionicons name="document-outline" size={16} color={c.textSecondary} />
                <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                <AnimatedPressable onPress={handlePick} hitSlop={8}>
                  <Text style={styles.link}>Cambiar</Text>
                </AnimatedPressable>
              </View>

              {/* Columnas sin reconocer: el usuario las elige */}
              {parsed && !parsed.mapping && (
                <View style={styles.section}>
                  <Text style={styles.warning}>
                    No reconocimos las columnas de este archivo. Elige cuál es cada una:
                  </Text>
                  {(Object.keys(FIELD_LABELS) as ManualField[]).map((field) => (
                    <View key={field} style={styles.mappingRow}>
                      <Text style={styles.fieldLabel}>{FIELD_LABELS[field]}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.chipRow}>
                          {parsed.headers.map((h, i) => (
                            <AnimatedPressable
                              key={`${field}-${i}`}
                              style={[styles.chip, manual[field] === i && styles.chipSelected]}
                              onPress={() => setManual((prev) => ({ ...prev, [field]: i }))}
                              onPressFeedback={hapticToggle}
                            >
                              <Text style={styles.chipLabel}>{h || `Columna ${i + 1}`}</Text>
                            </AnimatedPressable>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  ))}
                </View>
              )}

              {parsed && parsed.rows.length > 0 && (
                <>
                  <View style={styles.section}>
                    <Text style={styles.fieldLabel}>¿A qué cuenta?</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.chipRow}>
                        {accounts.map((acc) => (
                          <AnimatedPressable
                            key={acc.id}
                            style={[styles.chip, accountId === acc.id && { borderColor: acc.colorHex, backgroundColor: acc.colorHex + '25' }]}
                            onPress={() => setAccountId(acc.id)}
                            onPressFeedback={hapticToggle}
                          >
                            <View style={[styles.chipDot, { backgroundColor: acc.colorHex }]} />
                            <Text style={styles.chipLabel}>{acc.name}</Text>
                          </AnimatedPressable>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  <View style={styles.summary}>
                    <Text style={styles.summaryMain}>{chosen.length} de {parsed.rows.length} seleccionados</Text>
                    <Text style={styles.summaryDetail}>
                      Ingresos <Text style={{ color: c.income }}>{formatCurrency(incomeTotal)}</Text>
                      {'  ·  '}Gastos <Text style={{ color: c.expense }}>{formatCurrency(expenseTotal)}</Text>
                    </Text>
                    {duplicates.size > 0 && (
                      <Text style={styles.summaryDetail}>
                        {duplicates.size} ya existían en esta cuenta y quedaron sin marcar.
                      </Text>
                    )}
                    {parsed.skipped > 0 && (
                      <Text style={styles.summaryDetail}>{parsed.skipped} filas sin fecha o monto se ignoraron (totales, saldos).</Text>
                    )}
                  </View>

                  {parsed.rows.map((row, i) => {
                    const isSelected = selected.has(i);
                    return (
                      <AnimatedPressable key={`${row.line}-${i}`} style={styles.row} onPress={() => toggle(i)}>
                        <Ionicons
                          name={isSelected ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={isSelected ? c.accent : c.textTertiary}
                        />
                        <View style={styles.rowInfo}>
                          <Text style={[styles.rowTitle, !isSelected && styles.rowMuted]} numberOfLines={1}>
                            {row.description || 'Sin descripción'}
                          </Text>
                          <Text style={styles.rowMeta}>
                            {formatDate(row.date)}
                            {duplicates.has(i) ? '  ·  Duplicado' : ''}
                          </Text>
                        </View>
                        <Text style={[styles.rowAmount, { color: row.type === 'income' ? c.income : c.expense }, !isSelected && styles.rowMuted]}>
                          {row.type === 'income' ? '+' : '-'}{formatCurrency(row.amount)}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </>
              )}

              {parsed && parsed.mapping && parsed.rows.length === 0 && (
                <Text style={styles.warning}>
                  No encontramos movimientos con fecha y monto en este archivo.
                </Text>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.lg, borderBottomWidth: 0.5, borderBottomColor: c.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: c.textPrimary },
  cancelBtn: { fontSize: 16, color: c.textSecondary },
  saveBtn: { fontSize: 16, fontWeight: '600', color: c.accent },
  disabled: { opacity: 0.35 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  intro: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.md },
  introTitle: { fontSize: 17, fontWeight: '600', color: c.textPrimary, textAlign: 'center' },
  introText: { fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 19 },
  pickButton: {
    marginTop: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
    borderRadius: radius.md, backgroundColor: c.accent,
  },
  pickButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  fileRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: c.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg,
  },
  fileName: { flex: 1, fontSize: 13, color: c.textPrimary },
  link: { fontSize: 13, fontWeight: '600', color: c.accent },
  section: { marginBottom: spacing.lg, gap: spacing.sm },
  warning: { fontSize: 13, color: c.orange, lineHeight: 19, marginBottom: spacing.sm },
  mappingRow: { gap: spacing.xs, marginBottom: spacing.sm },
  fieldLabel: {
    fontSize: 12, fontWeight: '500', color: c.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: c.surface, borderRadius: radius.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  chipSelected: { borderColor: c.accent, backgroundColor: c.accent + '1F' },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipLabel: { fontSize: 13, color: c.textPrimary },
  summary: {
    backgroundColor: c.surface, borderRadius: radius.md, padding: spacing.md,
    gap: 4, marginBottom: spacing.md,
  },
  summaryMain: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  summaryDetail: { fontSize: 12, color: c.textSecondary, lineHeight: 17 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.sm + 2, borderBottomWidth: 0.5, borderBottomColor: c.border,
  },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 14, color: c.textPrimary },
  rowMeta: { fontSize: 12, color: c.textTertiary, marginTop: 2 },
  rowAmount: { fontSize: 14, fontWeight: '600' },
  rowMuted: { opacity: 0.4 },
});
