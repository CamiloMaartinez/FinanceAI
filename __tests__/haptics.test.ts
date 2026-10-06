import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  haptics,
  hapticToggle,
  isHapticsEnabled,
  loadHapticsSetting,
  setHapticsEnabled,
} from '../src/utils/haptics';

describe('vibraciones', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await setHapticsEnabled(true);
  });

  it('cada tipo usa la API de expo-haptics que le corresponde', () => {
    haptics.selection();
    haptics.light();
    haptics.error();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('error');
  });

  it('con el interruptor apagado no vibra nada, tampoco por los nombres anteriores', async () => {
    await setHapticsEnabled(false);
    haptics.success();
    haptics.medium();
    hapticToggle();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('la preferencia se guarda y se recupera al arrancar', async () => {
    await setHapticsEnabled(false);
    await setHapticsEnabled(true); // estado en memoria distinto al guardado…
    await AsyncStorage.setItem('haptics-enabled', 'false');
    expect(await loadHapticsSetting()).toBe(false); // …manda lo guardado
    expect(isHapticsEnabled()).toBe(false);

    await AsyncStorage.clear();
    expect(await loadHapticsSetting()).toBe(true); // sin preferencia: encendidas
  });
});
