import * as SecureStore from 'expo-secure-store';
import { logActivity } from '../database/db';

const PIN_KEY = 'financeai-backup-pin';

export async function hasPinSet(): Promise<boolean> {
  const pin = await SecureStore.getItemAsync(PIN_KEY);
  return pin !== null;
}

export async function setPin(pin: string): Promise<void> {
  const hadPin = await hasPinSet();
  await SecureStore.setItemAsync(PIN_KEY, pin);
  await logActivity('Seguridad', 'seguridad', hadPin ? 'PIN de respaldo cambiado' : 'PIN de respaldo creado');
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  const ok = stored !== null && stored === pin;
  // Los intentos fallidos quedan en el historial de actividad
  if (!ok) await logActivity('Seguridad', 'seguridad', 'Intento fallido de PIN').catch(() => {});
  return ok;
}

export async function removePin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY);
  await logActivity('Seguridad', 'seguridad', 'PIN de respaldo eliminado');
}
