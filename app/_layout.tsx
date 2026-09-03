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
import { Onboarding } from '../src/components/Onboarding';
import { hasSeenOnboarding } from '../src/services/onboarding';
import { getActiveProfile } from '../src/services/profiles';
import { setDatabaseFileName } from '../src/database/db';

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
  const [isReady,        setIsReady]        = useState(false);
  const [isUnlocked,     setIsUnlocked]     = useState(false);
  const [needsBiometric, setNeedsBiometric] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Debe ser lo PRIMERO: define qué archivo de base de datos se abre
      // antes de que cualquier otra parte de la app intente usarlo.
      const activeProfile = await getActiveProfile();
      setDatabaseFileName(activeProfile.dbFileName);

      await seedIfEmpty();
      await evaluateAlerts();

      const seen = await hasSeenOnboarding();
      setOnboardingSeen(seen);

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

  if (!onboardingSeen) {
    return <Onboarding onFinish={() => setOnboardingSeen(true)} />;
  }

  if (needsBiometric && !isUnlocked) {
    return <LockScreen onUnlock={() => setIsUnlocked(true)} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}