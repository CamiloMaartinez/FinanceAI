import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { LogBox, View, ActivityIndicator } from 'react-native';
import { seedIfEmpty } from '../src/database/seed';
import { isBiometricAvailable } from '../src/services/biometricAuth';
import { LockScreen } from '../src/components/LockScreen';
import { colors } from '../src/constants/theme';

LogBox.ignoreLogs(['A props object containing a "key" prop']);

export default function RootLayout() {
  const [isReady,      setIsReady]      = useState(false);
  const [isUnlocked,   setIsUnlocked]   = useState(false);
  const [needsBiometric, setNeedsBiometric] = useState(false);

  useEffect(() => {
    const init = async () => {
      await seedIfEmpty();

      const available = await isBiometricAvailable();
      setNeedsBiometric(available);
      setIsUnlocked(!available); // Si no hay biometría disponible, desbloqueamos directo

      setIsReady(true);
    };
    init();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.blue} />
      </View>
    );
  }

  if (needsBiometric && !isUnlocked) {
    return <LockScreen onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}