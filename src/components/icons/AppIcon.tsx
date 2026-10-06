import React from 'react';
import Svg, { G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { ICON_SET, isAppIcon } from './iconSet';

interface AppIconProps {
  /** Nombre del set propio ("comida", "banco"…) o, como respaldo, de Ionicons. */
  name: string;
  size?: number;
  /** Color del trazo. */
  color: string;
  /** Color del relleno. Por defecto, el mismo del trazo con opacidad. */
  accent?: string;
  strokeWidth?: number;
}

/**
 * Ícono del set propio. Si el nombre no es del set (datos guardados antes,
 * cuando las categorías usaban Ionicons), se pinta con Ionicons para no
 * romper nada; si tampoco existe ahí, un círculo neutro.
 */
export function AppIcon({ name, size = 24, color, accent, strokeWidth = 2 }: AppIconProps) {
  if (isAppIcon(name)) {
    const parts = ICON_SET[name];
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        color={color}
        accessible={false}
        importantForAccessibility="no"
        testID={`app-icon-${name}`}
      >
        {'accent' in parts && parts.accent && (
          <G fill={accent ?? color} fillOpacity={accent ? 1 : 0.28} stroke="none">
            {parts.accent}
          </G>
        )}
        <G fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          {parts.stroke}
        </G>
      </Svg>
    );
  }

  const ionicon = name in Ionicons.glyphMap ? (name as keyof typeof Ionicons.glyphMap) : 'ellipse-outline';
  return <Ionicons name={ionicon} size={Math.round(size * 0.92)} color={color} accessible={false} />;
}
