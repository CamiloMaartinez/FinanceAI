import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { createAlert, getAllAlerts, updateAlertTriggered } from '../../src/database/db';

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    router: { push: (...args: unknown[]) => mockPush(...args), navigate: jest.fn(), back: jest.fn(), canGoBack: () => true },
    // Sin navegación real: "enfocar" es montar
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

import MoreScreen from '../../app/(tabs)/(more)/more';

// El conteo de alertas llega asíncrono y el pulso del punto se repite sin
// fin, así que se espera un momento real en vez de usar waitFor
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 50)); });

describe('menú Más', () => {
  it('abre cada módulo en el Stack de Más con su ruta pública', async () => {
    await render(<MoreScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /^Metas\./ }));
    expect(mockPush).toHaveBeenCalledWith('/goals');

    await fireEvent.press(screen.getByRole('button', { name: /^Deudas y préstamos\./ }));
    expect(mockPush).toHaveBeenLastCalledWith('/debts');
  });

  it('sin alertas disparadas hoy no hay punto en vivo', async () => {
    await render(<MoreScreen />);
    await settle();
    expect(screen.queryByTestId('alertas-en-vivo', { includeHiddenElements: true })).toBeNull();
  });

  it('una alerta disparada hoy enciende el punto en vivo de "Alertas" (B5)', async () => {
    await createAlert('Saldo bajo', 'balance_below', 'below', 100_000, null);
    const [alert] = await getAllAlerts();
    await updateAlertTriggered(alert.id);

    await render(<MoreScreen />);
    await settle();
    expect(screen.getByTestId('alertas-en-vivo', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Alertas\..*1 alerta hoy$/ })).toBeTruthy();
  });
});
