import React from 'react';
import { Tabs } from 'expo-router/js-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { AnimatedTabBar } from '../../src/components/navigation/AnimatedTabBar';

// Ícono relleno cuando la pestaña está activa, outline cuando no — el
// relleno ES el estado seleccionado, sin depender solo del color (§16).
function TabIcon(outline: keyof typeof Ionicons.glyphMap, filled: keyof typeof Ionicons.glyphMap) {
  return ({ color, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <Ionicons name={focused ? filled : outline} size={22} color={color as string} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      // Barra propia: píldora flotante con indicador animado
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{ headerShown: false }}
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
