import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { TextInput } from './ui/TextInput';
import { useColors, fonts, radius, spacing, PASTEL_LIST, type ThemeColors } from '../constants/theme';
import { CATEGORY_ICONS, type AppIconName } from './icons/iconSet';
import { CategoryBadge } from './icons/CategoryBadge';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { Button } from './ui/Button';
import { Sheet } from './ui/Sheet';
import { Text } from './ui/Text';
import { hapticToggle, hapticDelete } from '../utils/haptics';
import type { Category } from '../models/types';
import type { CategoryInput } from '../database/db';

interface CategoryFormProps {
  visible: boolean;
  /** Categoría a editar; null para crear una nueva. */
  initial: Category | null;
  onClose: () => void;
  onSave: (input: CategoryInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function CategoryForm({ visible, initial, onClose, onSave, onDelete }: CategoryFormProps) {
  const c = useColors();
  const s = useMemo(() => createStyles(c), [c]);
  const [name, setName] = useState('');
  const [iconName, setIconName] = useState<string>('otros');
  const [colorHex, setColorHex] = useState(PASTEL_LIST[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(initial?.name ?? '');
    setIconName(initial?.iconName ?? 'comida');
    setColorHex(initial?.colorHex ?? PASTEL_LIST[0]);
    setError('');
  }, [visible, initial]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Escribe un nombre');
      return;
    }
    setSaving(true);
    try {
      await onSave({ name, iconName, colorHex });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!onDelete || !initial) return;
    hapticDelete();
    Alert.alert('Borrar categoría', `Los movimientos de "${initial.name}" quedarán sin categoría.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            await onDelete();
            onClose();
          } catch (e) {
            Alert.alert('No se pudo borrar', e instanceof Error ? e.message : '');
          }
        },
      },
    ]);
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.previewRow}>
            <CategoryBadge iconName={iconName} colorHex={colorHex} size={56} />
            <Text style={s.title}>{initial ? 'Editar categoría' : 'Nueva categoría'}</Text>
          </View>

          <Text style={s.label}>Nombre</Text>
          <TextInput
            value={name}
            onChangeText={(t) => { setName(t); setError(''); }}
            placeholder="Ej. Café"
            placeholderTextColor={c.textTertiary}
            style={s.input}
            maxLength={30}
            accessibilityLabel="Nombre de la categoría"
          />

          <Text style={s.label}>Color</Text>
          <View style={s.colors} accessibilityRole="radiogroup">
            {PASTEL_LIST.map((color) => {
              const selected = color === colorHex;
              return (
                <AnimatedPressable
                  key={color}
                  onPress={() => setColorHex(color)}
                  onPressFeedback={hapticToggle}
                  pressScale={0.9}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Color ${PASTEL_NAMES[color] ?? color}`}
                  style={[s.colorDot, { backgroundColor: color }, selected && s.colorDotSelected]}
                />
              );
            })}
          </View>

          <Text style={s.label}>Ícono</Text>
          <View style={s.icons} accessibilityRole="radiogroup">
            {CATEGORY_ICONS.map(({ name: icon, label }) => {
              const selected = icon === iconName;
              return (
                <AnimatedPressable
                  key={icon}
                  onPress={() => setIconName(icon as AppIconName)}
                  onPressFeedback={hapticToggle}
                  pressScale={0.9}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={label}
                  style={[s.iconCell, selected && s.iconCellSelected]}
                >
                  <CategoryBadge iconName={icon} colorHex={colorHex} size={44} />
                </AnimatedPressable>
              );
            })}
          </View>

          {!!error && <Text style={s.error} accessibilityLiveRegion="polite">{error}</Text>}

          <Button label={initial ? 'Guardar cambios' : 'Crear categoría'} onPress={handleSave} loading={saving} />
          {initial && !initial.isDefault && onDelete && (
            <Button label="Borrar categoría" variant="plain" onPress={confirmDelete} style={s.deleteButton} haptic={null} />
          )}
          {initial?.isDefault && (
            <Text style={s.note}>Es una categoría de fábrica: puedes cambiarla, pero no borrarla.</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Sheet>
  );
}

const PASTEL_NAMES: Record<string, string> = {
  '#F8C98F': 'durazno',
  '#D9DAFB': 'lavanda',
  '#CDEFD9': 'menta',
  '#FBDDE6': 'rosa',
  '#CDEEF7': 'celeste',
  '#FBEFB8': 'amarillo',
  '#E8D5F7': 'lila',
  '#F9C9C0': 'coral',
};

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    scroll: { maxHeight: 640 },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
    previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
    title: { fontFamily: fonts.bold, fontSize: 22, color: c.textPrimary },
    label: { fontFamily: fonts.semibold, fontSize: 13, color: c.textSecondary, marginBottom: spacing.sm, marginTop: spacing.md },
    input: {
      fontFamily: fonts.medium,
      fontSize: 16,
      color: c.textPrimary,
      backgroundColor: c.surfaceSecondary,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    colors: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    colorDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: 'transparent' },
    colorDotSelected: { borderColor: c.primary },
    icons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
    iconCell: { padding: 3, borderRadius: radius.pill, borderWidth: 2, borderColor: 'transparent' },
    iconCellSelected: { borderColor: c.accent },
    error: { fontFamily: fonts.medium, fontSize: 13, color: c.expense, marginBottom: spacing.md },
    deleteButton: { marginTop: spacing.sm },
    note: { fontFamily: fonts.regular, fontSize: 12, color: c.textSecondary, textAlign: 'center', marginTop: spacing.md },
  });
}
