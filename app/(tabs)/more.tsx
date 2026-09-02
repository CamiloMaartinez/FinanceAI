import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors, spacing, typography } from '../../src/constants/theme';

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
        <View style={styles.header}>
          <Text style={styles.label}>MÁS</Text>
          <Text style={styles.title}>Módulos</Text>
        </View>

        <View style={styles.divider} />

        {MENU_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={item.route}
            style={[
              styles.menuRow,
              index < MENU_ITEMS.length - 1 && styles.menuRowBorder,
            ]}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.6}
          >
            <View style={styles.menuIcon}>
              <Ionicons name={item.icon} size={18} color={c.textSecondary} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuDesc}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={14} color={c.textTertiary} />
          </TouchableOpacity>
        ))}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  header: { paddingVertical: spacing.lg },
  label: { ...typography.label, color: c.textTertiary, marginBottom: spacing.xs },
  title: { fontSize: 26, fontWeight: '200', color: c.textPrimary, letterSpacing: -0.5 },
  divider: { height: 0.5, backgroundColor: c.borderStrong, marginBottom: spacing.xl },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  menuRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 0.5, borderColor: c.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '300', color: c.textPrimary, marginBottom: 2 },
  menuDesc: { fontSize: 12, fontWeight: '300', color: c.textTertiary },
});