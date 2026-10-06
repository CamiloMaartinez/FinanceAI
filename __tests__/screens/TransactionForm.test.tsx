import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { TransactionForm } from '../../src/components/TransactionForm';
import type { Account, Category } from '../../src/models/types';

// La sugerencia de categoría con IA hace una petición a internet: aquí no
jest.mock('../../src/services/ai', () => ({ suggestCategory: jest.fn(async () => null) }));

const accounts: Account[] = [
  { id: 'a1', name: 'Ahorros', type: 'savings', balance: 1_000_000, currency: 'COP', colorHex: '#0A84FF', iconName: 'wallet', isActive: true, createdAt: '' },
  { id: 'a2', name: 'Dólares', type: 'savings', balance: 100, currency: 'USD', colorHex: '#34C759', iconName: 'cash', isActive: true, createdAt: '' },
];
const categories: Category[] = [
  { id: 'cat-food', name: 'Comida', iconName: 'fast-food-outline', colorHex: '#FF9500', isDefault: true, subcategories: [] },
];

let onSave: jest.Mock;

async function openForm() {
  onSave = jest.fn();
  await render(
    <TransactionForm visible accounts={accounts} categories={categories} onClose={() => {}} onSave={onSave as never} />
  );
}
// El monto se escribe en la pantalla de monto: teclado propio y deslizar para confirmar
async function enterAmount(text: string) {
  await fireEvent.press(screen.getByRole('button', { name: /Escribir el monto|Toca para cambiarlo/ }));
  for (const ch of text.replace(/\./g, '')) {
    await fireEvent.press(screen.getByRole('button', { name: ch === ',' ? 'Coma decimal' : ch }));
  }
  await fireEvent(screen.getByRole('button', { name: 'Desliza para confirmar' }), 'accessibilityAction', {
    nativeEvent: { actionName: 'activate' },
  });
}

beforeEach(async () => {
  await openForm();
});

describe('formulario de movimiento', () => {
  it('no deja guardar sin monto', async () => {
    await fireEvent.press(screen.getByText('Guardar'));
    expect(screen.getByText('Ingresa un monto válido')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('un gasto exige categoría', async () => {
    await enterAmount('25.000');
    await fireEvent.press(screen.getByText('Guardar'));
    expect(screen.getByText('Selecciona una categoría')).toBeTruthy();
  });

  it('guarda un gasto con monto, categoría y nota', async () => {
    await enterAmount('25.000');
    await fireEvent.press(screen.getByText('Comida'));
    await fireEvent.changeText(screen.getByPlaceholderText('Ej: Almuerzo con amigos'), 'Almuerzo');
    await fireEvent.press(screen.getByText('Guardar'));

    expect(onSave).toHaveBeenCalledTimes(1);
    const [input, recurrence, splitWith] = onSave.mock.calls[0] as [Record<string, unknown>, unknown, unknown];
    expect(input).toMatchObject({ amount: 25_000, type: 'expense', accountId: 'a1', categoryId: 'cat-food', notes: 'Almuerzo' });
    expect(recurrence).toBeNull();
    expect(splitWith).toBeNull();
  });

  it('un ingreso que se repite cada mes envía la frecuencia', async () => {
    await fireEvent.press(screen.getByText('Ingreso'));
    await enterAmount('3.000.000');
    await fireEvent.press(screen.getByText('Mensual'));
    await fireEvent.press(screen.getByText('Guardar'));

    const [input, recurrence] = onSave.mock.calls[0] as [Record<string, unknown>, unknown];
    expect(input).toMatchObject({ amount: 3_000_000, type: 'income', categoryId: null });
    expect(recurrence).toBe('monthly');
  });

  it('transferencia a otra moneda calcula lo que llega con la tasa del día', async () => {
    await fireEvent.press(screen.getByText('Transferencia'));
    await fireEvent.press(screen.getByText('Dólares (USD)'));
    await enterAmount('1.000.000');

    // Tasa de respaldo sin internet: 1 USD = 4.000 COP → llegan 250 USD
    expect(screen.getByText('Recibes en Dólares')).toBeTruthy();
    await waitFor(() => expect(screen.getByDisplayValue('250')).toBeTruthy());

    await fireEvent.press(screen.getByText('Guardar'));
    const [input] = onSave.mock.calls[0] as [Record<string, unknown>];
    expect(input).toMatchObject({ type: 'transfer', accountId: 'a1', toAccountId: 'a2', amount: 1_000_000, toAmount: 250 });
  });

  it('el monto que llega se puede corregir a mano', async () => {
    await fireEvent.press(screen.getByText('Transferencia'));
    await fireEvent.press(screen.getByText('Dólares (USD)'));
    await enterAmount('1.000.000');
    await waitFor(() => expect(screen.getByDisplayValue('250')).toBeTruthy());

    await fireEvent.changeText(screen.getByDisplayValue('250'), '245,5');
    await fireEvent.press(screen.getByText('Guardar'));
    const [input] = onSave.mock.calls[0] as [Record<string, unknown>];
    expect(input.toAmount).toBe(245.5);
  });

  it('dividir un gasto muestra cuánto le toca a cada uno y envía las personas', async () => {
    await enterAmount('90.000');
    await fireEvent.press(screen.getByText('Comida'));
    await fireEvent.press(screen.getByText('Dividir con otros'));

    const name = screen.getByPlaceholderText('Nombre de la persona');
    await fireEvent.changeText(name, 'Ana');
    await fireEvent(name, 'submitEditing');
    await fireEvent.changeText(name, 'Luis');
    await fireEvent(name, 'submitEditing');

    expect(screen.getByText(/tu gasto es \$30\.000 y cada persona te debe \$30\.000/)).toBeTruthy();
    // Dividir y repetir no se combinan: la opción Repetir se oculta
    expect(screen.queryByText('Mensual')).toBeNull();

    await fireEvent.press(screen.getByText('Guardar'));
    const [input, recurrence, splitWith] = onSave.mock.calls[0] as [Record<string, unknown>, unknown, unknown];
    expect(input.amount).toBe(90_000);
    expect(recurrence).toBeNull();
    expect(splitWith).toEqual(['Ana', 'Luis']);
  });
});
