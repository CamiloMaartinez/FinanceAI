import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { LogBox, View, ActivityIndicator } from 'react-native';
import { seedIfEmpty } from '../src/database/seed';
import { isBiometricAvailable } from '../src/services/biometricAuth';
import { LockScreen } from '../src/components/LockScreen';
import { ThemeProvider } from '../src/context/ThemeContext';
import { evaluateAlerts } from '../src/services/alertEngine';
import { useColors } from '../src/constants/theme';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

LogBox.ignoreLogs(['A props object containing a "key" prop']);

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <RootLayoutInner />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function RootLayoutInner() {
  const c = useColors();
  const [isReady,      setIsReady]      = useState(false);
  const [isUnlocked,   setIsUnlocked]   = useState(false);
  const [needsBiometric, setNeedsBiometric] = useState(false);

  useEffect(() => {
    const init = async () => {
      await seedIfEmpty();
      await evaluateAlerts();

      const available = await isBiometricAvailable();
      setNeedsBiometric(available);
      setIsUnlocked(!available); // Si no hay biometría disponible, desbloqueamos directo

      setIsReady(true);
    };
    init();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={c.blue} />
      </View>
    );
  }

  if (needsBiometric && !isUnlocked) {
    return <LockScreen onUnlock={() => setIsUnlocked(true)} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}