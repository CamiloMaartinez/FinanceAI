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
      {/* "Más" es un Stack: el menú y, encima, el módulo que se abra (ver (more)/_layout) */}
      <Tabs.Screen
        name="(more)"
        options={{
          title: 'Más',
          tabBarIcon: TabIcon('grid-outline', 'grid'),
          // Al volver a la pestaña se ve el menú, no el último módulo abierto
          popToTopOnBlur: true,
        }}
      />
    </Tabs>
  );
}
