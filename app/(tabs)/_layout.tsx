import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../src/constants/theme';
import { TAB_BAR_HEIGHT } from '../../src/constants/layout';
import { GlassView } from '../../src/components/ui/GlassView';
import { Platform, type ColorValue } from 'react-native';

// Ícono relleno cuando la pestaña está activa, outline cuando no — el
// relleno ES el estado seleccionado, sin depender solo del color (§16).
function TabIcon(outline: keyof typeof Ionicons.glyphMap, filled: keyof typeof Ionicons.glyphMap) {
  return ({ color, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <Ionicons name={focused ? filled : outline} size={20} color={color as string} />
  );
}

export default function TabsLayout() {
  const c = useColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.textPrimary,
        tabBarInactiveTintColor: c.textTertiary,
        // Flota sobre el contenido en vez de empujarlo — el material
        // translúcido solo tiene sentido si algo se desliza debajo (§12).
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0.5,
          borderTopColor: c.borderStrong,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          height: TAB_BAR_HEIGHT,
          elevation: 0,
        },
        tabBarBackground: () => (
          <GlassView weight="thick" style={{ flex: 1 }} />
        ),
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '500',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: TabIcon('home-outline', 'home'),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Movimientos',
          tabBarIcon: TabIcon('swap-vertical-outline', 'swap-vertical'),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reportes',
          tabBarIcon: TabIcon('stats-chart-outline', 'stats-chart'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: TabIcon('person-outline', 'person'),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Más',
          tabBarIcon: TabIcon('grid-outline', 'grid'),
        }}
      />

      {/* Pantallas ocultas de la barra pero accesibles */}
      <Tabs.Screen name="accounts"      options={{ href: null }} />
      <Tabs.Screen name="goals"         options={{ href: null }} />
      <Tabs.Screen name="subscriptions" options={{ href: null }} />
      <Tabs.Screen name="assistant"     options={{ href: null }} />
      <Tabs.Screen name="cards"         options={{ href: null }} />
      <Tabs.Screen name="alerts"        options={{ href: null }} />
      <Tabs.Screen name="budgets"       options={{ href: null }} />
      <Tabs.Screen name="challenges"    options={{ href: null }} />
      <Tabs.Screen name="debts"         options={{ href: null }} />
    </Tabs>
  );
}
