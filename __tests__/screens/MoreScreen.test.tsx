import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), navigate: jest.fn(), back: jest.fn(), canGoBack: () => true },
}));

import MoreScreen from '../../app/(tabs)/(more)/more';

describe('menú Más', () => {
  it('abre cada módulo en el Stack de Más con su ruta pública', async () => {
    await render(<MoreScreen />);
    await fireEvent.press(screen.getByRole('button', { name: /^Metas\./ }));
    expect(mockPush).toHaveBeenCalledWith('/goals');

    await fireEvent.press(screen.getByRole('button', { name: /^Deudas y préstamos\./ }));
    expect(mockPush).toHaveBeenLastCalledWith('/debts');
  });
});
