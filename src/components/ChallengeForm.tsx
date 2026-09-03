import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, radius } from '../constants/theme';
import type { Category } from '../models/types';

interface ChallengeFormProps {
  visible: boolean;
  categories: Category[];
  onClose: () => void;
  onSave: (title: string, description: string, categoryId: string, days: number) => void;
}

const DURATIONS = [
  { days: 7,  label: '1 semana' },
  { days: 14, label: '2 semanas' },
  { days: 30, label: '1 mes' },
];

export function ChallengeForm({ visible, categories, onClose, onSave }: ChallengeFormProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  const handleClose = () => {
    setCategoryId(null);
    setDays(7);
    onClose();
  };

  const handleCreate = () => {
    if (!categoryId) return;
    const category = categories.find((cat) => cat.id === categoryId);
    const categoryName = category?.name ?? 'esta categoría';
    const durationLabel = DURATIONS.find((d) => d.days === days)?.label ?? `${days} días`;

    const title = `No gastes en ${categoryName}`;
    const description = `Reto de ${durationLabel}: no registres ningún gasto en ${categoryName} durante este período.`;

    onSave(title, description, categoryId, days);
    handleClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelBtn}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nuevo reto</Text>
          <TouchableOpacity onPress={handleCreate} disabled={!categoryId}>
            <Text style={[styles.createBtn, !categoryId && styles.createBtnDisabled]}>Crear</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>¿En qué categoría no vas a gastar?</Text>
            <View style={styles.chipGrid}>
              {categories.map((cat) => {
                const selected = categoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.chip, selected && { backgroundColor: cat.colorHex + '25', borderColor: cat.colorHex }]}
                    onPress={() => setCategoryId(cat.id)}
                  >
                    <Ionicons
                      name={cat.iconName as any}
                      size={14}
                      color={selected ? cat.colorHex : c.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.chipLabel, selected && { color: cat.colorHex, fontWeight: '600' }]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>¿Por cuánto tiempo?</Text>
            <View style={styles.chipRow}>
              {DURATIONS.map((d) => {
                const selected = days === d.days;
                return (
                  <TouchableOpacity
                    key={d.days}
                    style={[styles.durationChip, selected && styles.durationChipSelected]}
                    onPress={() => setDays(d.days)}
                  >
                    <Text style={[styles.chipLabel, selected && styles.durationLabelSelected]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {categoryId && (
            <View style={styles.previewBox}>
              <Ionicons name="flag-outline" size={16} color={c.orange} />
              <Text style={styles.previewText}>
                No gastes en {categories.find((cat) => cat.id === categoryId)?.name} durante {DURATIONS.find((d) => d.days === days)?.label}
              </Text>
            </View>
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
  createBtn: { fontSize: 16, fontWeight: '600', color: c.blue },
  createBtnDisabled: { color: c.textTertiary },
  form: { padding: spacing.lg },
  field: { marginBottom: spacing.xl },
  fieldLabel: {
    fontSize: 13, fontWeight: '500', color: c.textSecondary,
    marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.surface, borderRadius: radius.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  chipLabel: { fontSize: 13, color: c.textSecondary },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  durationChip: {
    flex: 1, alignItems: 'center',
    backgroundColor: c.surface, borderRadius: radius.md,
    paddingVertical: spacing.md,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  durationChipSelected: { borderColor: c.blue, backgroundColor: 'rgba(0,122,255,0.1)' },
  durationLabelSelected: { color: c.blue, fontWeight: '600' },
  previewBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(255,149,0,0.1)', borderRadius: radius.md, padding: spacing.md,
  },
  previewText: { flex: 1, fontSize: 12.5, color: c.textSecondary, lineHeight: 17 },
});
