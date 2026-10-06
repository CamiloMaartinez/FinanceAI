import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Wrapper centralizado: toda vibración de la app pasa por aquí para respetar
// el interruptor "Vibraciones" de Perfil. Si el dispositivo no soporta
// haptics (algunos Android, el simulador, iOS en ahorro de batería),
// expo-haptics falla solo — igual envolvemos en try/catch para que nunca
// rompa un flujo de guardado.

const STORAGE_KEY = 'haptics-enabled';

// Preferencia del dispositivo, no del perfil: es cómo se siente el teléfono
let enabled = true;

export function isHapticsEnabled(): boolean {
  return enabled;
}

/** Lee la preferencia guardada. Se llama una vez al arrancar la app. */
export async function loadHapticsSetting(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    enabled = stored !== 'false';
  } catch {
    enabled = true;
  }
  return enabled;
}

export async function setHapticsEnabled(value: boolean): Promise<void> {
  enabled = value;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    // Si no se pudo guardar, al menos vale para esta sesión
  }
}

function run(play: () => Promise<void>) {
  if (!enabled) return;
  try {
    play().catch(() => {});
  } catch {
    // no-op
  }
}

export const haptics = {
  /** Cambio de selección: chips, interruptores, pestañas. */
  selection: () => run(() => Haptics.selectionAsync()),
  /** Golpe suave: guardar, cruzar un umbral. */
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Golpe medio: borrar. */
  medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Golpe fuerte: confirmaciones importantes (deslizar para confirmar). */
  heavy: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

// Nombres anteriores, usados en toda la app. Pasan por el mismo interruptor.
export const hapticToggle = haptics.selection;
export const hapticSave = haptics.light;
export const hapticDelete = haptics.medium;
export const hapticHeavy = haptics.heavy;
export const hapticSuccess = haptics.success;
