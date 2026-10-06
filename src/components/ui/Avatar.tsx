import React from 'react';
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import { fonts, ink, PASTEL_LIST } from '../../constants/theme';
import { resolveAvatarUri } from '../../services/avatarStorage';
import type { AppProfile } from '../../services/profiles';
import { Text } from './Text';

/** "Camilo Martínez" → "CM"; "ana" → "A". */
export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words.slice(0, 2).map((w) => w[0]!.toLocaleUpperCase('es-CO')).join('');
}

/** Un pastel fijo para cada perfil, para que no cambie entre aperturas. */
export function defaultAvatarColor(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return PASTEL_LIST[hash % PASTEL_LIST.length];
}

interface AvatarProps {
  profile: Pick<AppProfile, 'id' | 'name' | 'avatarType' | 'avatarUri' | 'avatarEmoji' | 'avatarColor'> | null;
  /** Nombre para las iniciales (por defecto, el del perfil). */
  name?: string;
  size?: number;
  /** Foto aún no guardada (vista previa del editor). */
  previewUri?: string | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * Avatar del perfil: foto, emoji o iniciales sobre un pastel. Es
 * decorativo; el botón que lo contiene lleva el nombre accesible.
 */
export function Avatar({ profile, name, size = 40, previewUri, style }: AvatarProps) {
  const color = profile?.avatarColor || defaultAvatarColor(profile?.id ?? 'default');
  const photo = previewUri ?? (profile?.avatarType === 'photo' ? resolveAvatarUri(profile.avatarUri) : null);
  const base = {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: color,
  };

  return (
    <View style={[base, style]} accessible={false} importantForAccessibility="no-hide-descendants" testID="avatar">
      {photo ? (
        <Image source={{ uri: photo }} style={{ width: size, height: size }} testID="avatar-photo" />
      ) : profile?.avatarType === 'emoji' && profile.avatarEmoji ? (
        <Text style={{ fontSize: Math.round(size * 0.52), lineHeight: Math.round(size * 0.66) }}>{profile.avatarEmoji}</Text>
      ) : (
        <Text style={{ fontFamily: fonts.bold, fontSize: Math.round(size * 0.38), color: ink }}>
          {initialsOf(name ?? profile?.name)}
        </Text>
      )}
    </View>
  );
}
