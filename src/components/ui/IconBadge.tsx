import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pastels, ink } from '../../constants/theme';

interface IconBadgeProps {
  /** Ícono de Ionicons. Para otro contenido (SVG propio), usa `children`. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Fondo pastel del círculo. */
  color?: string;
  iconColor?: string;
  /** Diámetro del círculo. El ícono ocupa ~48 %. */
  size?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/** Ícono dentro de un círculo pastel. Es decorativo: el texto de al lado lo describe. */
export function IconBadge({
  icon,
  color = pastels.lavender,
  iconColor = ink,
  size = 44,
  style,
  children,
}: IconBadgeProps) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {children ?? (icon ? <Ionicons name={icon} size={Math.round(size * 0.48)} color={iconColor} /> : null)}
    </View>
  );
}
