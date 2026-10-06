import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { LogBox, View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from '@expo-google-fonts/outfit';
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
import { setDatabaseFileName, processDueRecurring, processDueGoalContributions } from '../src/database/db';
import { scheduleBackupReminder } from '../src/services/backup';
import { refreshSubscriptionBilling } from '../src/services/subscriptionBilling';
import { refreshExchangeRates } from '../src/services/exchangeRates';
import { loadHapticsSetting } from '../src/utils/haptics';

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
  // Si la fuente falla, la app sigue con la del sistema en vez de quedarse cargando
  const [fontsLoaded, fontError] = useFonts({
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });
  const fontsReady = fontsLoaded || fontError != null;

  useEffect(() => {
    const init = async () => {
      // Debe ser lo PRIMERO: define qué archivo de base de datos se abre
      // antes de que cualquier otra parte de la app intente usarlo.
      const activeProfile = await getActiveProfile();
      setDatabaseFileName(activeProfile.dbFileName);
      setActiveProfileId(activeProfile.id);
      // Antes de cualquier toque: la preferencia "Vibraciones" de Perfil
      await loadHapticsSetting();

      await seedIfEmpty();
      // Antes de las alertas, para que los recurrentes generados cuenten
      // en los presupuestos. Si falla, la app arranca igual.
      await processDueRecurring().catch(() => 0);
      await processDueGoalContributions().catch(() => 0);
      await refreshSubscriptionBilling().catch(() => 0);
      await evaluateAlerts();
      // No bloquea el arranque: si falla, simplemente no hay recordatorio
      scheduleBackupReminder().catch(() => {});
      // Tampoco bloquea: sin internet se usan las últimas tasas guardadas
      refreshExchangeRates().catch(() => {});

      const seen = await hasSeenOnboarding(activeProfile.id);
      setOnboardingSeen(seen);

      const available = await isBiometricAvailable();
      setNeedsBiometric(available);
      setIsUnlocked(!available); // Si no hay biometría disponible, desbloqueamos directo

      setIsReady(true);
    };
    init();
  }, []);

  // La pantalla de carga hace de splash hasta que estén la base de datos y la fuente
  if (!isReady || !fontsReady) {
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

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* El detalle se dibuja encima de la pantalla anterior y anima su propia expansión */}
      <Stack.Screen name="account/[id]" options={{ presentation: 'transparentModal', animation: 'none' }} />
    </Stack>
  );
}