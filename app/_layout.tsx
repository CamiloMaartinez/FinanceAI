import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { LogBox, View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { setDatabaseFileName, processDueRecurring } from '../src/database/db';
import { scheduleBackupReminder } from '../src/services/backup';
import { refreshSubscriptionBilling } from '../src/services/subscriptionBilling';

LogBox.ignoreLogs(['A props object containing a "key" prop']);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <RootLayoutInner />
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

function RootLayoutInner() {
  const c = useColors();
  const [isReady,        setIsReady]        = useState(false);
  const [isUnlocked,     setIsUnlocked]     = useState(false);
  const [needsBiometric, setNeedsBiometric] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState('default');

  useEffect(() => {
    const init = async () => {
      // Debe ser lo PRIMERO: define qué archivo de base de datos se abre
      // antes de que cualquier otra parte de la app intente usarlo.
      const activeProfile = await getActiveProfile();
      setDatabaseFileName(activeProfile.dbFileName);
      setActiveProfileId(activeProfile.id);

      await seedIfEmpty();
      // Antes de las alertas, para que los recurrentes generados cuenten
      // en los presupuestos. Si falla, la app arranca igual.
      await processDueRecurring().catch(() => 0);
      await refreshSubscriptionBilling().catch(() => 0);
      await evaluateAlerts();
      // No bloquea el arranque: si falla, simplemente no hay recordatorio
      scheduleBackupReminder().catch(() => {});

      const seen = await hasSeenOnboarding(activeProfile.id);
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
    return <Onboarding profileId={activeProfileId} onFinish={() => setOnboardingSeen(true)} />;
  }

  if (needsBiometric && !isUnlocked) {
    return <LockScreen onUnlock={() => setIsUnlocked(true)} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}