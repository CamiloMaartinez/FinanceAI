import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import DebtsScreen from '../../app/(tabs)/debts';

// Los recordatorios usan el sistema de notificaciones del teléfono
jest.mock('../../src/services/debtReminders', () => ({
  scheduleDebtReminders: jest.fn(async () => {}),
  cancelDebtReminders: jest.fn(async () => {}),
}));

describe('pantalla de deudas (flujo completo con base de datos real)', () => {
  it('crear una deuda, ver los totales, abonar y saldarla', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(<DebtsScreen />);

    // 1. Pantalla vacía
    await waitFor(() => expect(screen.getByText('Sin deudas registradas')).toBeTruthy());

    // 2. Nueva deuda: Ana me debe $100.000
    await fireEvent.press(screen.getByText('+ Registrar deuda'));
    await fireEvent.changeText(screen.getByPlaceholderText('Nombre'), 'Ana');
    await fireEvent.changeText(screen.getAllByPlaceholderText('0')[0], '100.000');
    await fireEvent.press(screen.getByText('Guardar'));

    // 3. Aparece la tarjeta y el total "Te deben"
    await waitFor(() => expect(screen.getByText('Ana')).toBeTruthy());
    expect(screen.getByText('1 abierta')).toBeTruthy();
    expect(screen.getAllByText('$100.000').length).toBeGreaterThanOrEqual(2); // total y pendiente

    // 4. Abono de $40.000
    await fireEvent.press(screen.getByText('Registrar abono'));
    await fireEvent.changeText(screen.getAllByPlaceholderText('0')[0], '40.000');
    await fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(screen.getAllByText('$60.000').length).toBeGreaterThanOrEqual(1));

    // 5. "Todo lo pendiente" la salda y pasa a SALDADAS
    await fireEvent.press(screen.getByText('Registrar abono'));
    await fireEvent.press(screen.getByText('Todo lo pendiente'));
    await fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(screen.getByText('SALDADAS')).toBeTruthy());
    expect(screen.getByText('0 abiertas')).toBeTruthy();
    expect(alertSpy).toHaveBeenCalledWith('Deuda saldada', 'La deuda con Ana quedó en cero.');
  });

  it('no deja registrar un abono mayor a lo pendiente', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render(<DebtsScreen />);
    await waitFor(() => expect(screen.getByText(/abierta/)).toBeTruthy());

    // La base de datos conserva la deuda de la prueba anterior: se usa el
    // botón + del encabezado, identificado por su nombre accesible
    await fireEvent.press(screen.getByLabelText('Nueva deuda'));
    await fireEvent.changeText(screen.getByPlaceholderText('Nombre'), 'Luis');
    await fireEvent.changeText(screen.getAllByPlaceholderText('0')[0], '50.000');
    await fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(screen.getByText('Luis')).toBeTruthy());

    await fireEvent.press(screen.getAllByText('Registrar abono')[0]);
    await fireEvent.changeText(screen.getAllByPlaceholderText('0')[0], '80.000');
    await fireEvent.press(screen.getByText('Guardar'));
    expect(screen.getByText(/El abono no puede superar lo pendiente/)).toBeTruthy();
  });
});
