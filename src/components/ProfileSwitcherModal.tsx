import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text } from './ui/Text';
import { TextInput } from './ui/TextInput';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, radius } from '../constants/theme';
import {
  getProfiles,
  getActiveProfileId,
  setActiveProfile,
  createProfile,
  deleteProfile,
  type AppProfile,
} from '../services/profiles';
import { Sheet } from './ui/Sheet';
import { Button } from './ui/Button';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { hapticToggle } from '../utils/haptics';
import { Avatar } from './ui/Avatar';
import { useCurtain } from '../context/CurtainContext';
import { useAppRestart } from '../context/AppRestartContext';

interface ProfileSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ProfileSwitcherModal({ visible, onClose }: ProfileSwitcherModalProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const [profiles, setProfiles] = useState<AppProfile[]>([]);
  const [activeId, setActiveId] = useState('');
  const [step, setStep] = useState<'list' | 'create'>('list');
  const [newName, setNewName] = useState('');
  const runCurtain = useCurtain();
  const restart = useAppRestart();

  const load = async () => {
    const [list, id] = await Promise.all([getProfiles(), getActiveProfileId()]);
    setProfiles(list);
    setActiveId(id);
  };

  useEffect(() => {
    if (visible) {
      setStep('list');
      setNewName('');
      load();
    }
  }, [visible]);

  const handleSwitch = (profile: AppProfile) => {
    if (profile.id === activeId) return;

    Alert.alert(
      `Cambiar a "${profile.name}"`,
      'La app se recargará con los datos de este perfil.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cambiar', onPress: () => {
            onClose();
            // Debajo de la cortina: se activa el perfil y la app arranca con sus datos
            runCurtain(async () => {
              await setActiveProfile(profile.id);
              await restart();
            });
          },
        },
      ]
    );
  };

  const handleDelete = (profile: AppProfile) => {
    Alert.alert(
      `Eliminar "${profile.name}"`,
      'Se borrarán TODOS los datos de este perfil de tu dispositivo. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive', onPress: async () => {
            try {
              await deleteProfile(profile.id);
              await load();
            } catch (err) {
              Alert.alert('No se pudo eliminar', err instanceof Error ? err.message : 'Error desconocido');
            }
          },
        },
      ]
    );
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createProfile(newName.trim());
    setStep('list');
    setNewName('');
    await load();
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{step === 'list' ? 'Perfiles' : 'Nuevo perfil'}</Text>
          <AnimatedPressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} hitSlop={8} onPressFeedback={hapticToggle}>
            <Ionicons name="close" size={22} color={c.textTertiary} />
          </AnimatedPressable>
        </View>

        {step === 'list' ? (
          <>
            <Text style={styles.subtitle}>
              Cada perfil tiene sus propios datos, completamente separados.
            </Text>

            <ScrollView style={styles.list}>
              {profiles.map((profile) => {
                const isActive = profile.id === activeId;
                return (
                  <AnimatedPressable
                    key={profile.id}
                    style={styles.profileRow}
                    onPress={() => handleSwitch(profile)}
                    onLongPress={() => profile.id !== 'default' && handleDelete(profile)}
                    onPressFeedback={hapticToggle}
                    pressScale={0.99}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={isActive ? `${profile.name}, perfil activo` : `Cambiar a ${profile.name}`}
                    accessibilityHint={profile.id !== 'default' ? 'Mantén presionado para eliminarlo' : undefined}
                  >
                    <Avatar profile={profile} size={36} style={isActive ? styles.avatarActive : undefined} />
                    <Text style={styles.profileName}>{profile.name}</Text>
                    {isActive && <Text style={styles.activeLabel}>Activo</Text>}
                  </AnimatedPressable>
                );
              })}
            </ScrollView>

            <Button label="Nuevo perfil" variant="plain" onPress={() => setStep('create')} haptic={null} />
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>Dale un nombre a este perfil (ej. tu nombre, o "Negocio")</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del perfil"
              placeholderTextColor={c.textTertiary}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.buttonsRow}>
              <Button label="Cancelar" variant="secondary" onPress={() => setStep('list')} haptic={null} style={styles.flexBtn} />
              <Button label="Crear" variant="primary" onPress={handleCreate} style={styles.flexBtn} />
            </View>
          </>
        )}
      </View>
    </Sheet>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  content: {
    padding: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.md,
    maxHeight: '85%',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
  subtitle: { fontSize: 12.5, color: c.textTertiary, lineHeight: 17 },
  list: { maxHeight: 280 },
  profileRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: c.border,
  },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: c.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: c.accent },
  avatarActive: { borderWidth: 2, borderColor: c.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent },
  profileName: { flex: 1, fontSize: 14, color: c.textPrimary },
  activeLabel: { fontSize: 11, fontWeight: '600', color: c.accent },
  input: {
    backgroundColor: c.surfaceSecondary, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: 15, color: c.textPrimary,
  },
  buttonsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  flexBtn: { flex: 1 },
});
