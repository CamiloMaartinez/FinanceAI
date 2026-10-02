import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, radius } from '../constants/theme';
import { scanReceipt } from '../services/receiptScanner';
import { AnimatedPressable } from './ui/AnimatedPressable';

interface ReceiptScannerButtonProps {
  onScanned: (amount: number | null, notes: string) => void;
}

export function ReceiptScannerButton({ onScanned }: ReceiptScannerButtonProps) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const [isScanning, setIsScanning] = useState(false);

  const handlePress = async () => {
    // Pedir permiso de cámara
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso necesario',
        'FinanceAI necesita acceso a tu cámara para escanear recibos. Actívalo en Ajustes.'
      );
      return;
    }

    // Abrir la cámara
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0]?.base64) {
      return;
    }

    setIsScanning(true);
    try {
      const scanned = await scanReceipt(result.assets[0].base64);

      if (scanned.amount === null) {
        Alert.alert(
          'No se pudo leer el monto',
          'Intenta tomar la foto de nuevo, asegurándote de que el total sea visible y la imagen esté bien iluminada.'
        );
        return;
      }

      onScanned(scanned.amount, scanned.suggestedNotes);
    } catch (err) {
      Alert.alert(
        'Error al escanear',
        err instanceof Error ? err.message : 'Intenta de nuevo'
      );
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <AnimatedPressable
      style={styles.button}
      onPress={handlePress}
      disabled={isScanning}
    >
      {isScanning ? (
        <>
          <ActivityIndicator size="small" color={c.accent} />
          <Text style={styles.text}>Analizando recibo...</Text>
        </>
      ) : (
        <>
          <Ionicons name="camera-outline" size={20} color={c.accent} />
          <Text style={styles.text}>Escanear recibo</Text>
        </>
      )}
    </AnimatedPressable>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: c.accent + '1A',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: c.accent + '4D',
    borderStyle: 'dashed',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: c.blue,
  },
});