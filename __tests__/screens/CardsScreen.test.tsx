import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CardsScreen from '../../app/(tabs)/cards';
import * as db from '../../src/database/db';
import { cardAmountLabel } from '../../src/components/CompactCardList';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true, navigate: jest.fn() } }));

describe('tarjetas en vista compacta', () => {
  it('el monto muestra el cupo si existe, si no la cuota', () => {
    const base = { id: 'x', name: 'A', bank: 'B', cashbackPercent: 0, interestRate: 28, benefits: [], colorHex: '#000000', isFavorite: false, createdAt: '' };
    expect(cardAmountLabel({ ...base, annualFee: 0, creditLimit: 5_000_000 })).toBe('Cupo $5.000.000');
    expect(cardAmountLabel({ ...base, annualFee: 0 })).toBe('Sin cuota');
    expect(cardAmountLabel({ ...base, annualFee: 120_000 })).toBe('Cuota $120.000');
  });

  it('agrupa muchas tarjetas en una pila, la abre, expande una y recuerda la vista', async () => {
    for (let i = 1; i <= 5; i++) {
      await db.createCard(`Tarjeta ${i}`, 'Banco', 0, 1, 28, [], '#2E3192', { network: 'visa', last4: `000${i}`, creditLimit: i * 1_000_000 });
    }
    await render(<CardsScreen />);

    await waitFor(() => expect(screen.getByText('+4 tarjetas · Toca para verlas todas')).toBeTruthy());
    // En la pila solo hay 3 visibles
    expect(screen.queryByText('Tarjeta 5')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Ver las 5 tarjetas' }));
    await waitFor(() => expect(screen.getByText('Tarjeta 5')).toBeTruthy());
    expect(screen.getByText('•••• 0005')).toBeTruthy();

    // Tocar una fila la expande a la tarjeta completa
    await fireEvent.press(screen.getByRole('button', { name: /Tarjeta 2, terminada en 0002/ }));
    await waitFor(() => expect(screen.getByText('Cuota anual')).toBeTruthy());

    await fireEvent.press(screen.getByRole('button', { name: 'Completa' }));
    await waitFor(async () => expect(await AsyncStorage.getItem('cards-view-mode')).toBe('full'));
  });
});
