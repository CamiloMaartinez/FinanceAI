import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => {
  const router = { back: jest.fn(), navigate: jest.fn(), push: jest.fn(), canGoBack: () => true };
  const params: Record<string, string> = {};
  return { router, useRouter: () => router, useLocalSearchParams: () => params, useFocusEffect: () => {} };
});
const { router: mockRouter, useLocalSearchParams } = require('expo-router');
const mockParams = useLocalSearchParams() as Record<string, string>;
jest.mock('react-native-gifted-charts', () => {
  const React = require('react');
  return { LineChart: () => React.createElement('LineChart') };
});

import AccountDetailScreen from '../../app/account/[id]';
import { AccountCard } from '../../src/components/AccountCard';
import { AccountForm } from '../../src/components/AccountForm';
import * as db from '../../src/database/db';
import type { Account } from '../../src/models/types';

const card: Account = {
  id: 'acc-1', name: 'Visa Oro', type: 'credit', balance: 250_000, currency: 'COP',
  colorHex: '#4B2BA8', gradientTo: null, iconName: 'tarjeta', isActive: true, createdAt: new Date().toISOString(),
};

describe('AccountCard', () => {
  it('muestra nombre, tipo, aclaración del saldo y abre el detalle', async () => {
    const onPress = jest.fn();
    await render(<AccountCard account={card} onPress={onPress} />);
    expect(screen.getByText('Visa Oro')).toBeTruthy();
    expect(screen.getByText('Por pagar')).toBeTruthy();
    const button = screen.getByRole('button', { name: /Visa Oro, Tarjeta crédito\. Por pagar: \$250\.000/ });
    await fireEvent.press(button);
    await waitFor(() => expect(onPress).toHaveBeenCalledWith(card, null));
  });
});

describe('AccountForm en modo edición', () => {
  it('llega prellenado, bloquea la moneda con movimientos y avisa del ajuste', async () => {
    const onSave = jest.fn(async (_values: unknown) => {});
    await render(<AccountForm visible initial={card} hasMovements onClose={() => {}} onSave={onSave} />);
    expect(screen.getByText('Editar cuenta')).toBeTruthy();
    expect(screen.getByDisplayValue('Visa Oro')).toBeTruthy();
    expect(screen.getByText(/La moneda no se puede cambiar/)).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Saldo actual'), '200.000');
    expect(screen.getByText(/Ajuste de saldo/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: 'Vino' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ name: 'Visa Oro', balance: 200_000, colorHex: '#6E1F3A', currency: 'COP' });
  });
});

describe('detalle de cuenta', () => {
  it('muestra datos, movimientos y no deja eliminar si hay historial', async () => {
    const id = await db.createAccount('Ahorros', 'savings', 500_000, '#CDEFD9', 'ahorro', 'COP');
    await db.createTransaction({ type: 'expense', amount: 20_000, accountId: id, categoryId: null, notes: 'Mercado',
      date: new Date().toISOString(), toAccountId: null, toAmount: null });
    mockParams.id = id;
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await render(<AccountDetailScreen />);
    await waitFor(() => expect(screen.getByText('Mercado')).toBeTruthy());
    expect(screen.getByText('Peso colombiano (COP)')).toBeTruthy();
    expect(screen.getByText('−$20.000')).toBeTruthy(); // salió este mes

    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar' }));
    expect(alertSpy).toHaveBeenCalledWith('No se puede eliminar', expect.stringContaining('Archívala'));

    await fireEvent.press(screen.getByRole('button', { name: 'Transferir' }));
    expect(mockRouter.navigate).toHaveBeenCalledWith({ pathname: '/transactions', params: { nuevo: 'transferencia', cuenta: id } });
  });
});
