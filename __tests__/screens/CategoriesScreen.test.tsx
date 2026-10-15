import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import CategoriesScreen from '../../app/(tabs)/(more)/categories';
import { seedIfEmpty } from '../../src/database/seed';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true, navigate: jest.fn() } }));

describe('editor de categorías', () => {
  // Siembra la base y monta la pantalla entera: ~2,5 s sola, más cuando
  // corre en paralelo con el resto de la suite
  it('crea una categoría nueva desde la pantalla', async () => {
    await seedIfEmpty();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(<CategoriesScreen />);

    await waitFor(() => expect(screen.getByText('Alimentación')).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Nueva categoría' }));
    await fireEvent.changeText(screen.getByLabelText('Nombre de la categoría'), 'Gimnasio');
    await fireEvent.press(screen.getByRole('radio', { name: 'Salud' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Crear categoría' }));

    await waitFor(() => expect(screen.getByText('Gimnasio')).toBeTruthy());
    expect(screen.getByText('Creada por ti')).toBeTruthy();
  }, 15_000);
});
