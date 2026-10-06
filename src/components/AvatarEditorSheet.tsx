import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useColors, fonts, radius, spacing, PASTEL_LIST, type ThemeColors } from '../constants/theme';
import { saveAvatarPhoto, deleteAvatarPhoto } from '../services/avatarStorage';
import { updateProfileAvatar, type AppProfile, type AvatarType } from '../services/profiles';
import { hapticToggle, hapticSuccess } from '../utils/haptics';
import { Avatar, defaultAvatarColor } from './ui/Avatar';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';
import { Sheet } from './ui/Sheet';
import { Text } from './ui/Text';

export const AVATAR_EMOJIS = [
  '😀', '😎', '🤓', '🥳', '🤠', '😺', '🦊', '🐶', '🐼', '🦁', '🐸', '🐵',
  '🦄', '🐙', '🌵', '🌻', '🍀', '🔥', '⭐', '🚀', '🎧', '⚽', '🎨', '💼',
];

interface AvatarEditorSheetProps {
  visible: boolean;
  profile: AppProfile | null;
  /** Nombre para las iniciales. */
  name: string;
  onClose: () => void;
}

/** Hoja para elegir foto (galería o cámara) o un avatar ilustrado. */
export function AvatarEditorSheet({ visible, profile, name, onClose }: AvatarEditorSheetProps) {
  const c = useColors();
  const s = useMemo(() => createStyles(c), [c]);
  const [type, setType] = useState<AvatarType>('initials');
  const [emoji, setEmoji] = useState(AVATAR_EMOJIS[0]);
  const [color, setColor] = useState(PASTEL_LIST[0]);
  // Foto recién elegida (URI temporal del selector); se copia al guardar
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !profile) return;
    setType(profile.avatarType ?? 'initials');
    setEmoji(profile.avatarEmoji ?? AVATAR_EMOJIS[0]);
    setColor(profile.avatarColor ?? defaultAvatarColor(profile.id));
    setPendingPhoto(null);
  }, [visible, profile]);

  const hasPhoto = !!pendingPhoto || (profile?.avatarType === 'photo' && !!profile.avatarUri);

  const pickPhoto = async (source: 'camera' | 'library') => {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permiso necesario',
        source === 'camera' ? 'Activa el acceso a la cámara en Ajustes.' : 'Activa el acceso a tus fotos en Ajustes.',
        [{ text: 'Cancelar', style: 'cancel' }, { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() }]
      );
      return;
    }
    // Recorte cuadrado: en iOS el recorte siempre es cuadrado; aspect aplica en Android
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 };
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets[0]) {
      setPendingPhoto(result.assets[0].uri);
      setType('photo');
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      let avatarUri = profile.avatarUri ?? null;
      if (type === 'photo' && pendingPhoto) {
        avatarUri = saveAvatarPhoto(pendingPhoto, profile.id);
        if (profile.avatarUri) deleteAvatarPhoto(profile.avatarUri);
      } else if (type !== 'photo' && profile.avatarUri) {
        // Pasó a ilustrado: la foto anterior ya no se usa
        deleteAvatarPhoto(profile.avatarUri);
        avatarUri = null;
      }
      await updateProfileAvatar(profile.id, {
        avatarType: type === 'photo' && !avatarUri ? 'initials' : type,
        avatarUri,
        avatarEmoji: emoji,
        avatarColor: color,
      });
      hapticSuccess();
      onClose();
    } catch (e) {
      Alert.alert('No se pudo guardar el avatar', e instanceof Error ? e.message : '');
    } finally {
      setSaving(false);
    }
  };

  const preview = profile ? { ...profile, avatarType: type, avatarEmoji: emoji, avatarColor: color } : null;
  const illustrated = type !== 'photo';

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={s.content}>
        <View style={s.previewWrap}>
          <Avatar profile={preview} name={name} size={96} previewUri={type === 'photo' ? pendingPhoto : null} />
        </View>

        <View style={s.segment} accessibilityRole="tablist">
          <Chip label="Ilustrado" selected={illustrated} onPress={() => setType(type === 'photo' ? 'initials' : type)} />
          <Chip label="Foto" selected={!illustrated} onPress={() => (hasPhoto ? setType('photo') : pickPhoto('library'))} />
        </View>

        {illustrated ? (
          <>
            <View style={s.segment}>
              <Chip label="Iniciales" selected={type === 'initials'} onPress={() => setType('initials')} />
              <Chip label="Emoji" selected={type === 'emoji'} onPress={() => setType('emoji')} />
            </View>

            {type === 'emoji' && (
              <View style={s.emojiGrid} accessibilityRole="radiogroup">
                {AVATAR_EMOJIS.map((e) => (
                  <AnimatedPressable
                    key={e}
                    onPress={() => setEmoji(e)}
                    onPressFeedback={hapticToggle}
                    pressScale={0.88}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: e === emoji }}
                    accessibilityLabel={`Emoji ${e}`}
                    style={[s.emojiCell, e === emoji && s.cellSelected]}
                  >
                    <Text style={s.emoji}>{e}</Text>
                  </AnimatedPressable>
                ))}
              </View>
            )}

            <Text style={s.label}>Color de fondo</Text>
            <View style={s.colors} accessibilityRole="radiogroup">
              {PASTEL_LIST.map((p, i) => (
                <AnimatedPressable
                  key={p}
                  onPress={() => setColor(p)}
                  onPressFeedback={hapticToggle}
                  pressScale={0.88}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: p === color }}
                  accessibilityLabel={`Color ${i + 1} de ${PASTEL_LIST.length}`}
                  style={[s.colorDot, { backgroundColor: p }, p === color && s.colorSelected]}
                />
              ))}
            </View>
          </>
        ) : (
          <View style={s.photoButtons}>
            <PhotoButton icon="images-outline" label="Elegir de la galería" onPress={() => pickPhoto('library')} s={s} c={c} />
            <PhotoButton icon="camera-outline" label="Tomar foto" onPress={() => pickPhoto('camera')} s={s} c={c} />
          </View>
        )}

        <Button label="Guardar" onPress={handleSave} loading={saving} style={s.save} />
      </View>
    </Sheet>
  );
}

function PhotoButton({ icon, label, onPress, s, c }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; s: ReturnType<typeof createStyles>; c: ThemeColors;
}) {
  return (
    <AnimatedPressable
      style={s.photoButton}
      onPress={onPress}
      onPressFeedback={hapticToggle}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={c.textPrimary} />
      <Text style={s.photoButtonText}>{label}</Text>
    </AnimatedPressable>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
    previewWrap: { alignItems: 'center', marginBottom: spacing.lg },
    segment: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md },
    emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: spacing.sm },
    emojiCell: {
      width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: 'transparent',
    },
    cellSelected: { borderColor: c.accent, backgroundColor: c.surfaceSecondary },
    emoji: { fontSize: 24, lineHeight: 30 },
    label: { fontFamily: fonts.semibold, fontSize: 13, color: c.textSecondary, marginBottom: spacing.sm, marginTop: spacing.sm },
    colors: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },
    colorDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: 'transparent' },
    colorSelected: { borderColor: c.primary },
    photoButtons: { gap: spacing.sm, marginBottom: spacing.md },
    photoButton: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md,
      backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg,
    },
    photoButtonText: { fontFamily: fonts.semibold, fontSize: 15, color: c.textPrimary },
    save: { marginTop: spacing.sm },
  });
}
