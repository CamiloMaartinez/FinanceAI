import React from 'react';
import { Stack } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import { useColors } from '../../../src/constants/theme';

// Los módulos (Metas, Deudas…) se apilan sobre el menú "Más": entran desde
// la derecha y salen al revés, con la transición nativa (interrumpible, y en
// iOS se puede volver deslizando desde el borde). La barra de pestañas
// sigue visible y "Más" queda resaltado.
export const unstable_settings = {
  // Abrir un módulo directo (p. ej. /accounts desde Inicio) deja el menú debajo
  initialRouteName: 'more',
};

export default function MoreLayout() {
  const c = useColors();
  const reduceMotion = useReducedMotion();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Con "reducir movimiento", un fundido en vez del deslizamiento
        animation: reduceMotion ? 'fade' : 'slide_from_right',
        contentStyle: { backgroundColor: c.background },
      }}
    />
  );
}
