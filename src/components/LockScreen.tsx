import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../constants/theme';
import { authenticateWithBiometrics } from '../services/biometricAuth';

interface LockScreenProps {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [failedOnce, setFailedOnce] = useState(false);

  const handleUnlock = async () => {
    setIsAuthenticating(true);
    const success = await authenticateWithBiometrics();
    setIsAuthenticating(false);

    if (success) {
      onUnlock();
    } else {
      setFailedOnce(true);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="lock-closed" size={36} color={colors.blue} />
      </View>

      <Text style={styles.title}>FinanceAI</Text>
      <Text style={styles.subtitle}>
        Tu información financiera está protegida
      </Text>

      {failedOnce && (
        <Text style={styles.failedText}>
          No se pudo verificar tu identidad. Intenta de nuevo.
        </Text>
      )}

      <TouchableOpacity
        style={styles.unlockButton}
        onPress={handleUnlock}
        disabled={isAuthenticating}
      >
        {isAuthenticating ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="scan-outline" size={20} color="#fff" />
            <Text style={styles.unlockText}>Desbloquear</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,122,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  failedText: {
    fontSize: 13,
    color: colors.expense,
    marginBottom: spacing.md,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.blue,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minWidth: 180,
  },
  unlockText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});