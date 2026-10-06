import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { AnimatedAmount, formatIntegerWorklet } from '../../src/components/ui/AnimatedAmount';

describe('formatIntegerWorklet', () => {
  it('agrupa miles con punto y quita el signo', () => {
    expect(formatIntegerWorklet(0)).toBe('0');
    expect(formatIntegerWorklet(999)).toBe('999');
    expect(formatIntegerWorklet(1000)).toBe('1.000');
    expect(formatIntegerWorklet(1_234_567)).toBe('1.234.567');
    expect(formatIntegerWorklet(-25_000)).toBe('25.000');
  });

  it('redondea sin decimales y trunca cuando los decimales van aparte', () => {
    expect(formatIntegerWorklet(1_499.6)).toBe('1.500');
    expect(formatIntegerWorklet(1_499.6, 2)).toBe('1.499');
    // 1.999,999 se redondea a 2.000,00: el entero tiene que subir también
    expect(formatIntegerWorklet(1_999.999, 2)).toBe('2.000');
  });
});

describe('AnimatedAmount', () => {
  it('anuncia el valor final y lo actualiza cuando cambia', async () => {
    const view = await render(<AnimatedAmount value={1_200_000} testID="saldo" />);
    expect(screen.getByTestId('saldo').props.accessibilityLabel).toBe('$1.200.000');

    // Tras un gasto: el lector de pantalla no lee los cuadros intermedios
    await view.rerender(<AnimatedAmount value={1_150_000} testID="saldo" />);
    expect(screen.getByTestId('saldo').props.accessibilityLabel).toBe('$1.150.000');
  });

  it('muestra signo y decimales de otras monedas', async () => {
    await render(<AnimatedAmount value={-1_284.5} currency="USD" testID="saldo" />);
    expect(screen.getByTestId('saldo').props.accessibilityLabel).toBe('−US$1.284,50');
    expect(screen.getByText(',50')).toBeTruthy();
  });
});

describe('AnimatedAmount: el conteo', () => {
  // Avanza el reloj cuadro a cuadro, como lo haría la pantalla
  const advance = async (ms: number) => {
    for (let t = 0; t < ms; t += 16) {
      await act(async () => { jest.advanceTimersByTime(16); });
    }
  };
  const digits = () =>
    screen.getByTestId('saldo-cifras', { includeHiddenElements: true }).props.jestAnimatedProps.value.text;

  it('cuenta desde 0 y termina exactamente en el valor', async () => {
    jest.useFakeTimers();
    try {
      await render(<AnimatedAmount value={1_234_567} testID="saldo" />);
      await advance(300);
      const midway = Number(digits().split('.').join(''));
      expect(midway).toBeGreaterThan(0);
      expect(midway).toBeLessThan(1_234_567);

      await advance(1200);
      expect(digits()).toBe('1.234.567');
    } finally {
      jest.useRealTimers();
    }
  });

  it('si el valor cambia a mitad de camino, termina en el nuevo', async () => {
    jest.useFakeTimers();
    try {
      const view = await render(<AnimatedAmount value={1_200_000} testID="saldo" />);
      await advance(300);
      await view.rerender(<AnimatedAmount value={1_150_000} testID="saldo" />);
      await advance(1200);
      expect(digits()).toBe('1.150.000');
    } finally {
      jest.useRealTimers();
    }
  });
});
