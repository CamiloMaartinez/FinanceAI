import * as LocalAuthentication from 'expo-local-authentication';

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquea FinanceAI',
      cancelLabel: 'Cancelar',
      fallbackLabel: 'Usar código del dispositivo',
      disableDeviceFallback: false,
    });

    return result.success;
  } catch {
    return false;
  }
}