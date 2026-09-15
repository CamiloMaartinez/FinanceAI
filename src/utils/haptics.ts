import * as Haptics from 'expo-haptics';

// Wrapper centralizado: si el dispositivo no soporta haptics (algunos
// Android, o el simulador), expo-haptics falla silenciosamente solo — pero
// igual envolvemos en try/catch para que nunca rompa un flujo de guardado.

export function hapticSuccess() {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // no-op
  }
}

export function hapticSave() {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // no-op
  }
}

export function hapticToggle() {
  try {
    Haptics.selectionAsync();
  } catch {
    // no-op
  }
}

export function hapticDelete() {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // no-op
  }
}
