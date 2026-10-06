import { describe, expect, it, jest } from '@jest/globals';
import { AccessibilityInfo } from 'react-native';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react-native';

const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: mockNavigate, push: mockNavigate }),
  useFocusEffect: () => {},
  router: { push: jest.fn(), navigate: jest.fn() },
}));
// Las gráficas dependen de medidas reales de pantalla; aquí basta con que existan
jest.mock('react-native-gifted-charts', () => {
  const React = require('react');
  return { LineChart: () => React.createElement('LineChart'), BarChart: () => React.createElement('BarChart') };
});

import DashboardScreen from '../../app/(tabs)/index';
import * as db from '../../src/database/db';

describe('dashboard', () => {
  it('muestra saldo, cuentas, movimientos y abre los formularios desde los botones', async () => {
    await db.createAccount('Ahorros', 'savings', 1_000_000, '#5856D6', 'wallet', 'COP');
    const [account] = await db.getAllAccounts();
    await db.createTransaction({
      type: 'expense', amount: 25_000, accountId: account.id, categoryId: null,
      notes: 'Almuerzo', date: new Date().toISOString(), toAccountId: null, toAmount: null,
    });

    await render(<DashboardScreen />);

    await waitFor(() => expect(screen.getByText('Ahorros')).toBeTruthy());
    expect(screen.getByText('Mi saldo')).toBeTruthy();
    expect(screen.getByText('Almuerzo')).toBeTruthy();
    expect(screen.getByText('−$25.000')).toBeTruthy();

    // Los chips de periodo están y se pueden elegir
    await fireEvent.press(screen.getByRole('button', { name: '7 días' }));
    expect(screen.getByRole('button', { name: '7 días' }).props.accessibilityState).toEqual({ selected: true });

    await fireEvent.press(screen.getByRole('button', { name: 'Gasto' }));
    expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/transactions', params: { nuevo: 'gasto' } });

    // Con una sola cuenta no hay a dónde transferir
    expect(screen.getByRole('button', { name: 'Transferir' }).props.accessibilityState).toEqual({ disabled: true });
  });

  it('ocultar saldos tapa los montos', async () => {
    await render(<DashboardScreen />);
    await waitFor(() => expect(screen.getByText('Mi saldo')).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar saldos' }));
    expect(screen.getByLabelText('Saldo oculto')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mostrar saldos' })).toBeTruthy();
  });

  it('ocultar saldos también tapa el encabezado compacto', async () => {
    await render(<DashboardScreen />);
    await waitFor(() => expect(screen.getByText('Mi saldo')).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar saldos' }));
    const compact = screen.getByTestId('encabezado-compacto', { includeHiddenElements: true });
    expect(within(compact).getByText('••••', { includeHiddenElements: true })).toBeTruthy();
  });

  it('el lector de pantalla puede recargar con la acción "Actualizar" del saldo', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await render(<DashboardScreen />);
    await waitFor(() => expect(screen.getByTestId('saldo-total')).toBeTruthy());

    const balance = screen.getByTestId('saldo-total');
    expect(balance.props.accessibilityActions).toEqual([{ name: 'refresh', label: 'Actualizar' }]);
    await fireEvent(balance, 'accessibilityAction', { nativeEvent: { actionName: 'refresh' } });
    await waitFor(() => expect(announce).toHaveBeenCalledWith('Datos actualizados'));
    announce.mockRestore();
  });
});
