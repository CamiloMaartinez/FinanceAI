import React, { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useColors, fonts, spacing } from '../../constants/theme';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import { Mascot } from './Mascot';

interface CelebrationSheetProps {
  visible: boolean;
  title: string;
  message: string;
  /** Acción principal (p. ej. "Compartir"); sin ella solo queda "Listo". */
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
}

/** Hoja de logro con Moni celebrando: reemplaza la alerta de "¡Meta completada!". */
export function CelebrationSheet({ visible, title, message, actionLabel, onAction, onClose }: CelebrationSheetProps) {
  const c = useColors();

  // El logro se anuncia completo una vez, aunque el lector esté en otra parte
  useEffect(() => {
    if (visible) AccessibilityInfo.announceForAccessibility(`${title}. ${message}`);
  }, [visible, title, message]);

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <Mascot pose="celebrando" size={190} interactive />
        <Text style={[styles.title, { color: c.textPrimary }]} accessibilityRole="header">
          {title}
        </Text>
        <Text style={[styles.message, { color: c.textSecondary }]}>{message}</Text>
        <View style={styles.actions}>
          {actionLabel && onAction && (
            <Button
              label={actionLabel}
              onPress={() => {
                onClose();
                onAction();
              }}
            />
          )}
          <Button label={actionLabel ? 'Ahora no' : 'Listo'} variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.sm },
  title: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5, textAlign: 'center' },
  message: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.md },
});
