import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { ink, pastels } from '../../constants/theme';
import { isPastel } from '../../utils/color';
import { IconBadge } from '../ui/IconBadge';
import { AppIcon } from './AppIcon';

interface CategoryBadgeProps {
  iconName?: string | null;
  /** Color guardado de la categoría o cuenta. */
  colorHex?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Colores de un círculo de ícono según el color guardado. */
export function badgeColors(colorHex?: string | null): { bg: string; fg: string; accent?: string } {
  const color = colorHex || pastels.lavender;
  // Pastel (lo nuevo): el círculo es el pastel y el ícono va en tinta.
  // Saturado (categorías antiguas): fondo tenue del mismo color y el ícono en ese color.
  return isPastel(color)
    ? { bg: color, fg: ink, accent: '#FFFFFF' }
    : { bg: color + '2E', fg: color };
}

/** IconBadge + AppIcon: el círculo pastel con el ícono de una categoría o cuenta. */
export function CategoryBadge({ iconName, colorHex, size = 44, style }: CategoryBadgeProps) {
  const { bg, fg, accent } = badgeColors(colorHex);
  return (
    <IconBadge color={bg} size={size} style={style}>
      <AppIcon name={iconName || 'otros'} color={fg} accent={accent} size={Math.round(size * 0.56)} />
    </IconBadge>
  );
}
