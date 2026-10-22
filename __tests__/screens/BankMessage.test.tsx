import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { BankMessageModal } from '../../src/components/BankMessageModal';
import type { Account, Category, TransactionWithCategory } from '../../src/models/types';

const account = (id: string, name: string): Account => ({
  id, name, type: 'savings', balance: 0, currency: 'COP', colorHex: '#0A84FF',
  iconName: 'wallet', isActive: true, createdAt: '2026-01-01T00:00:00.000Z',
});
const accounts = [account('bc', 'Bancolombia *1234'), account('nq', 'Nequi')];
const categories: Category[] = [
  { id: 'mercado', name: 'Mercado', iconName: 'cart', colorHex: '#34C759', isDefault: true, subcategories: [] },
];
const history = [
  { id: 't1', amount: 80_000, type: 'expense', date: '2026-09-01T12:00:00.000Z', accountId: 'bc',
    categoryId: 'mercado', notes: 'Exito Calle 93', tags: [], createdAt: '2026-09-01T12:00:00.000Z' },
] as TransactionWithCategory[];

describe('registrar desde el mensaje del banco', () => {
  it('muestra lo que entendió y lo entrega al formulario', async () => {
    const onUse = jest.fn();
    await render(
      <BankMessageModal visible accounts={accounts} categories={categories} history={history} onClose={() => {}} onUse={onUse} />
    );

    await fireEvent.changeText(
      screen.getByLabelText('Texto del mensaje del banco'),
      'Bancolombia: Compraste $45.900,00 en EXITO CALLE 80 con tu T.Deb *1234.'
    );
    expect(screen.getByText('$45.900')).toBeTruthy();
    expect(screen.getByText('Exito Calle 80')).toBeTruthy();
    expect(screen.getByText('Bancolombia *1234')).toBeTruthy();
    expect(screen.getByText('Mercado')).toBeTruthy();

    await fireEvent.press(screen.getByText('Usar'));
    expect(onUse).toHaveBeenCalledWith(expect.objectContaining({
      type: 'expense', amount: 45_900, accountId: 'bc', categoryId: 'mercado', notes: 'Exito Calle 80',
    }));
  });

  it('avisa cuando el texto no es un movimiento', async () => {
    const onUse = jest.fn();
    await render(
      <BankMessageModal visible accounts={accounts} categories={categories} history={[]} onClose={() => {}} onUse={onUse} />
    );
    await fireEvent.changeText(screen.getByLabelText('Texto del mensaje del banco'), 'Tu clave dinamica es 123456');
    expect(screen.getByText(/No encontramos un movimiento/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Usar'));
    expect(onUse).not.toHaveBeenCalled();
  });
});
