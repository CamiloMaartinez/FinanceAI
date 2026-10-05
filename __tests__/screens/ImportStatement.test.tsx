import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ImportStatementModal } from '../../src/components/ImportStatementModal';
import { createAccount, getAllTransactionsWithCategory, getAllAccounts } from '../../src/database/db';

// Elegir el archivo abre el selector de documentos del teléfono: aquí se
// devuelve directamente un extracto de ejemplo
const mockStatement = [
  'Banco de Prueba',
  'Fecha;Descripción;Valor',
  '01/10/2026;PAGO NÓMINA;3.200.000,00',
  '02/10/2026;COMPRA ÉXITO;-187.350,00',
  '03/10/2026;NETFLIX;-44.900,00',
  'Total;;2.967.750,00',
].join('\n');
jest.mock('../../src/services/statementImport', () => ({
  pickStatementFile: jest.fn(async () => ({ name: 'extracto-octubre.csv', text: mockStatement })),
}));

describe('importar extracto (flujo completo con base de datos real)', () => {
  it('revisa, importa y en una segunda importación marca todo como duplicado', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await createAccount('Ahorros', 'savings', 0, '#0A84FF', 'wallet');

    // Primera importación
    const first = await render(<ImportStatementModal visible onClose={() => {}} />);
    await fireEvent.press(screen.getByText('Elegir archivo CSV'));
    await waitFor(() => expect(screen.getByText('3 de 3 seleccionados')).toBeTruthy());
    expect(screen.getByText('extracto-octubre.csv')).toBeTruthy();
    expect(screen.getByText(/1 filas sin fecha o monto se ignoraron/)).toBeTruthy();

    await fireEvent.press(screen.getByText('Importar'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Extracto importado', expect.stringContaining('3 movimientos')));
    expect(await getAllTransactionsWithCategory()).toHaveLength(3);
    expect((await getAllAccounts())[0].balance).toBe(3_200_000 - 187_350 - 44_900);
    await first.unmount();

    // Segunda importación del mismo archivo
    await render(<ImportStatementModal visible onClose={() => {}} />);
    await fireEvent.press(screen.getByText('Elegir archivo CSV'));
    await waitFor(() => expect(screen.getByText('0 de 3 seleccionados')).toBeTruthy());
    expect(screen.getByText('3 ya existían en esta cuenta y quedaron sin marcar.')).toBeTruthy();
    expect(screen.getAllByText(/Duplicado/)).toHaveLength(3);
  });
});
