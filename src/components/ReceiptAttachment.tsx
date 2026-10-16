import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Image, Modal, Alert } from 'react-native';
import { Text } from './ui/Text';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, spacing, radius } from '../constants/theme';
import { AnimatedPressable } from './ui/AnimatedPressable';
import { hapticToggle } from '../utils/haptics';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { timingExit, timingViewerIn } from '../constants/motion';

interface ReceiptAttachmentProps {
  // URI para mostrar (foto nueva temporal o la ya guardada), o null
  uri: string | null;
  onPick: (uri: string) => void;
  onRemove: () => void;
}

// Foto del recibo de un movimiento: tomarla, elegirla de la galería,
// verla en grande o quitarla.
export function ReceiptAttachment({ uri, onPick, onRemove }: ReceiptAttachmentProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);
  const [viewerOpen, setViewerOpen] = useState(false);

  const pick = async (source: 'camera' | 'library') => {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert(
        'Permiso necesario',
        source === 'camera'
          ? 'Activa el acceso a la cámara en Ajustes para fotografiar el recibo.'
          : 'Activa el acceso a tus fotos en Ajustes para adjuntar el recibo.'
      );
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets[0]?.uri) onPick(result.assets[0].uri);
  };

  if (!uri) {
    return (
      <View style={styles.buttonsRow}>
        <AnimatedPressable style={styles.option} onPress={() => pick('camera')} onPressFeedback={hapticToggle}>
          <Ionicons name="camera-outline" size={16} color={c.textSecondary} />
          <Text style={styles.optionLabel}>Tomar foto</Text>
        </AnimatedPressable>
        <AnimatedPressable style={styles.option} onPress={() => pick('library')} onPressFeedback={hapticToggle}>
          <Ionicons name="images-outline" size={16} color={c.textSecondary} />
          <Text style={styles.optionLabel}>Elegir de fotos</Text>
        </AnimatedPressable>
      </View>
    );
  }

  return (
    <>
      <View style={styles.attachedRow}>
        <AnimatedPressable onPress={() => setViewerOpen(true)} accessibilityLabel="Ver recibo">
          <Image source={{ uri }} style={styles.thumbnail} />
        </AnimatedPressable>
        <View style={styles.attachedInfo}>
          <Text style={styles.attachedLabel}>Recibo adjunto</Text>
          <Text style={styles.attachedHint}>Toca la imagen para verla</Text>
        </View>
        <AnimatedPressable onPress={onRemove} onPressFeedback={hapticToggle} hitSlop={8} accessibilityLabel="Quitar recibo">
          <Ionicons name="trash-outline" size={20} color={c.textTertiary} />
        </AnimatedPressable>
      </View>

      <ReceiptViewer uri={uri} visible={viewerOpen} topInset={insets.top} onClose={() => setViewerOpen(false)} />
    </>
  );
}

/**
 * Visor a pantalla completa (D6): el fondo negro y la foto entran con un
 * fundido y la foto crece de 0,96 a 1 (450 ms, curva de marca). La salida
 * es más corta. Con "reducir movimiento" el sistema deja solo el cambio.
 */
function ReceiptViewer({ uri, visible, topInset, onClose }: { uri: string; visible: boolean; topInset: number; onClose: () => void }) {
  const [mounted, setMounted] = useState(visible);
  const t = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      t.value = withTiming(1, timingViewerIn);
    } else if (mounted) {
      t.value = withTiming(0, timingExit, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: t.value }));
  const photoStyle = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ scale: 0.96 + 0.04 * t.value }] }));

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[viewerStyles.viewer, backdropStyle]}>
        <Animated.View style={[viewerStyles.photo, photoStyle]}>
          <Image source={{ uri }} style={viewerStyles.image} resizeMode="contain" accessibilityLabel="Foto del recibo" />
        </Animated.View>
        <AnimatedPressable
          style={[viewerStyles.close, { top: topInset + spacing.md }]}
          onPress={onClose}
          accessibilityLabel="Cerrar"
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </AnimatedPressable>
      </Animated.View>
    </Modal>
  );
}

// El visor es siempre oscuro, como la app Fotos
const viewerStyles = StyleSheet.create({
  viewer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center' },
  photo: { flex: 1 },
  image: { width: '100%', height: '100%' },
  close: {
    position: 'absolute',
    right: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  optionLabel: {
    fontSize: 13,
    color: c.textSecondary,
  },
  attachedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: c.border,
  },
  attachedInfo: {
    flex: 1,
  },
  attachedLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textPrimary,
  },
  attachedHint: {
    fontSize: 12,
    color: c.textTertiary,
    marginTop: 2,
  },
});
