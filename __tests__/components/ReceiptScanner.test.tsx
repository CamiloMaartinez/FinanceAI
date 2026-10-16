import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  launchCameraAsync: jest.fn(async () => ({
    canceled: false,
    assets: [{ uri: 'file:///recibo.jpg', base64: 'abc' }],
  })),
}));

let finishScan: (value: { amount: number; suggestedNotes: string }) => void = () => {};
jest.mock('../../src/services/receiptScanner', () => ({
  scanReceipt: jest.fn(() => new Promise((resolve) => { finishScan = resolve; })),
}));

import { ReceiptScannerButton } from '../../src/components/ReceiptScannerButton';

describe('escaneo de recibo (D6)', () => {
  it('muestra la foto con el láser mientras la IA la lee y la quita al terminar', async () => {
    const onScanned = jest.fn();
    await render(<ReceiptScannerButton onScanned={onScanned} />);
    expect(screen.queryByTestId('recibo-escaneando', { includeHiddenElements: true })).toBeNull();

    await act(async () => { fireEvent.press(screen.getByText('Escanear recibo')); });
    expect(screen.getByTestId('recibo-escaneando', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Moni está leyendo tu recibo…')).toBeTruthy();

    await act(async () => { finishScan({ amount: 45_000, suggestedNotes: 'Mercado' }); });
    expect(onScanned).toHaveBeenCalledWith(45_000, 'Mercado', 'file:///recibo.jpg');
    expect(screen.queryByTestId('recibo-escaneando', { includeHiddenElements: true })).toBeNull();
  });
});
