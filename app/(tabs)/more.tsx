import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors, spacing, radius, fonts, PASTEL_LIST } from '../../src/constants/theme';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { IconBadge } from '../../src/components/ui/IconBadge';
import { TAB_BAR_HEIGHT } from '../../src/constants/layout';
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable';
import { hapticToggle } from '../../src/utils/haptics';

interface MenuItem {
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    label: 'Presupuestos',
    description: 'Límite mensual y por categoría',
    icon: 'wallet-outline',
    route: '/(tabs)/budgets',
  },
  {
    label: 'Retos financieros',
    description: 'Ponte a prueba y gana disciplina',
    icon: 'flag-outline',
    route: '/(tabs)/challenges',
  },
  {
    label: 'Cuentas',
    description: 'Gestiona tus cuentas bancarias',
    icon: 'card-outline',
    route: '/(tabs)/accounts',
  },
  {
    label: 'Metas',
    description: 'Objetivos de ahorro con progreso',
    icon: 'trophy-outline',
    route: '/(tabs)/goals',
  },
  {
    label: 'Suscripciones',
    description: 'Servicios recurrentes y cobros',
    icon: 'repeat-outline',
    route: '/(tabs)/subscriptions',
  },
  {
    label: 'Deudas y préstamos',
    description: 'Quién te debe y a quién le debes',
    icon: 'people-outline',
    route: '/(tabs)/debts',
  },
  {
    label: 'Categorías',
    description: 'Íconos y colores de tus gastos',
    icon: 'pricetags-outline',
    route: '/(tabs)/categories',
  },
  {
    label: 'Asistente IA',
    description: 'Consulta financiera inteligente',
    icon: 'sparkles-outline',
    route: '/(tabs)/assistant',
  },
  {
    label: 'Tarjetas e Inversiones',
    description: 'Compara tarjetas, CDT, fondos y más',
    icon: 'layers-outline',
    route: '/(tabs)/cards',
  },
  {
    label: 'Alertas',
    description: 'Notificaciones financieras personalizadas',
    icon: 'notifications-outline',
    route: '/(tabs)/alerts',
  },
];

export default function MoreScreen() {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView entering={FadeIn.duration(350)}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader eyebrow="Más" title="Módulos" />

        <View style={styles.card}>
        {MENU_ITEMS.map((item, index) => (
          <Animated.View key={item.route} entering={FadeInDown.duration(300).delay(index * 60)}>
            <AnimatedPressable
              style={[
                styles.menuRow,
                index < MENU_ITEMS.length - 1 && styles.menuRowBorder,
              ]}
              onPress={() => router.push(item.route as any)}
              onPressFeedback={hapticToggle}
              pressScale={0.99}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}. ${item.description}`}
            >
              <IconBadge icon={item.icon} color={PASTEL_LIST[index % PASTEL_LIST.length]} size={40} />
              <View style={styles.menuInfo}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDesc}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={14} color={c.textTertiary} />
            </AnimatedPressable>
          </Animated.View>
        ))}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: TAB_BAR_HEIGHT + spacing.xl },
  card: { backgroundColor: c.surface, borderRadius: radius.xl, paddingHorizontal: spacing.lg, ...c.shadow.sm },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  menuRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderStrong,
  },
  menuInfo: { flex: 1 },
  menuLabel: { fontFamily: fonts.semibold, fontSize: 15, color: c.textPrimary, marginBottom: 2 },
  menuDesc: { fontFamily: fonts.regular, fontSize: 12, color: c.textSecondary },
});