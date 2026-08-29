import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../src/constants/theme';
import { Platform } from 'react-native';

export default function TabsLayout() {
  const c = useColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.textPrimary,
        tabBarInactiveTintColor: c.textTertiary,
        tabBarStyle: {
          backgroundColor: c.background,
          borderTopWidth: 0.5,
          borderTopColor: c.borderStrong,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          height: Platform.OS === 'ios' ? 80 : 60,
        },
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
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Movimientos',
          tabBarIcon: ({ color }) => (
            <Ionicons name="swap-vertical-outline" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reportes',
          tabBarIcon: ({ color }) => (
            <Ionicons name="stats-chart-outline" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Más',
          tabBarIcon: ({ color }) => (
            <Ionicons name="grid-outline" size={20} color={color} />
          ),
        }}
      />

      {/* Pantallas ocultas de la barra pero accesibles */}
      <Tabs.Screen name="accounts"      options={{ href: null }} />
      <Tabs.Screen name="goals"         options={{ href: null }} />
      <Tabs.Screen name="subscriptions" options={{ href: null }} />
      <Tabs.Screen name="assistant"     options={{ href: null }} />
      <Tabs.Screen name="cards"         options={{ href: null }} />
      <Tabs.Screen name="alerts"        options={{ href: null }} />
    </Tabs>
  );
}