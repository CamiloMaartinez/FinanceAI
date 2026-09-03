import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
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
      'Vas a cambiar de perfil. Cierra completamente la app y ábrela de nuevo para ver los datos de este perfil.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cambiar', onPress: async () => {
            await setActiveProfile(profile.id);
            onClose();
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
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{step === 'list' ? 'Perfiles' : 'Nuevo perfil'}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={c.textTertiary} />
            </TouchableOpacity>
          </View>

          {step === 'list' ? (
            <>
              <Text style={styles.subtitle}>
                Cada perfil tiene sus propios datos, completamente separados. Cambiar de perfil requiere reiniciar la app.
              </Text>

              <ScrollView style={styles.list}>
                {profiles.map((profile) => {
                  const isActive = profile.id === activeId;
                  return (
                    <TouchableOpacity
                      key={profile.id}
                      style={styles.profileRow}
                      onPress={() => handleSwitch(profile)}
                      onLongPress={() => profile.id !== 'default' && handleDelete(profile)}
                    >
                      <View style={[styles.radio, isActive && styles.radioActive]}>
                        {isActive && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.profileName}>{profile.name}</Text>
                      {isActive && <Text style={styles.activeLabel}>Activo</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity style={styles.addBtn} onPress={() => setStep('create')}>
                <Ionicons name="add" size={18} color={c.blue} />
                <Text style={styles.addBtnText}>Nuevo perfil</Text>
              </TouchableOpacity>
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
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep('list')}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleCreate}>
                  <Text style={styles.primaryBtnText}>Crear</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', padding: spacing.xl,
  },
  modalBox: {
    backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.xl,
    gap: spacing.md, borderWidth: 0.5, borderColor: c.borderStrong, maxHeight: '75%',
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
  radioActive: { borderColor: c.blue },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.blue },
  profileName: { flex: 1, fontSize: 14, color: c.textPrimary },
  activeLabel: { fontSize: 11, fontWeight: '600', color: c.blue },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: spacing.md, marginTop: spacing.xs,
  },
  addBtnText: { fontSize: 14, fontWeight: '600', color: c.blue },
  input: {
    backgroundColor: c.surfaceSecondary, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: 15, color: c.textPrimary,
  },
  buttonsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radius.md,
    borderWidth: 0.5, borderColor: c.borderStrong, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, color: c.textSecondary },
  primaryBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radius.md,
    backgroundColor: c.blue, alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
