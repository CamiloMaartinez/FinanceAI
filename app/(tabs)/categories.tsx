import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useCategories } from '../../src/hooks/useCategories';
import { CategoryForm } from '../../src/components/CategoryForm';
import { CategoryBadge } from '../../src/components/icons/CategoryBadge';
import { AssetRow } from '../../src/components/dashboard/AssetRow';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable';
import { Text } from '../../src/components/ui/Text';
import { useColors, fonts, radius, spacing, type ThemeColors } from '../../src/constants/theme';
import { TAB_BAR_HEIGHT } from '../../src/constants/layout';
import { hapticSave } from '../../src/utils/haptics';
import type { Category } from '../../src/models/types';

export default function CategoriesScreen() {
  const c = useColors();
  const s = useMemo(() => createStyles(c), [c]);
  const { categories, isLoading, save, remove } = useCategories();
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const openNew = () => {
    setEditing(null);
    setFormVisible(true);
  };
  const openEdit = (category: Category) => {
    setEditing(category);
    setFormVisible(true);
  };

  const own = categories.filter((cat) => !cat.isDefault);
  const defaults = categories.filter((cat) => cat.isDefault);

  const renderList = (list: Category[], offset: number) =>
    list.map((cat, i) => (
      <AssetRow
        key={cat.id}
        index={offset + i}
        badge={<CategoryBadge iconName={cat.iconName} colorHex={cat.colorHex} />}
        title={cat.name}
        detail={cat.isDefault ? 'De fábrica' : 'Creada por ti'}
        amount=""
        onPress={() => openEdit(cat)}
        accessibilityLabel={`${cat.name}. Toca para editar`}
      />
    ));

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Animated.ScrollView entering={FadeIn.duration(300)} contentContainerStyle={s.content}>
        <ScreenHeader
          eyebrow="Más"
          title="Categorías"
          back
          right={
            <AnimatedPressable
              style={s.addButton}
              onPress={openNew}
              onPressFeedback={hapticSave}
              accessibilityRole="button"
              accessibilityLabel="Nueva categoría"
            >
              <Ionicons name="add" size={22} color={c.onAccent} />
            </AnimatedPressable>
          }
        />

        {isLoading && categories.length === 0 ? (
          <ActivityIndicator color={c.textTertiary} />
        ) : (
          <>
            <View style={s.card}>
              <Text style={s.section}>Tus categorías</Text>
              {own.length === 0 ? (
                <Text style={s.empty}>Aún no has creado ninguna. Toca + para agregar una.</Text>
              ) : (
                renderList(own, 0)
              )}
            </View>
            <View style={s.card}>
              <Text style={s.section}>De fábrica</Text>
              {renderList(defaults, own.length)}
            </View>
          </>
        )}
      </Animated.ScrollView>

      <CategoryForm
        visible={formVisible}
        initial={editing}
        onClose={() => setFormVisible(false)}
        onSave={(input) => save(input, editing?.id)}
        onDelete={editing && !editing.isDefault ? () => remove(editing.id) : undefined}
      />
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: spacing.xl, paddingBottom: TAB_BAR_HEIGHT + spacing.xl },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      marginBottom: spacing.lg,
    },
    section: { fontFamily: fonts.bold, fontSize: 16, color: c.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs },
    empty: { fontFamily: fonts.regular, fontSize: 13, color: c.textSecondary, paddingVertical: spacing.md },
  });
}
