import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { RollingDigits, rollKeys } from '../../src/components/ui/RollingDigits';
import { AnimatedAmount } from '../../src/components/ui/AnimatedAmount';

describe('rollKeys', () => {
  it('odómetro: las unidades siempre tienen la misma columna', () => {
    expect(rollKeys('1.234', 'right')).toEqual(['r4', 'r3', 'r2', 'r1', 'r0']);
    expect(rollKeys('987', 'right')).toEqual(['r2', 'r1', 'r0']);
  });

  it('al escribir: los dígitos que ya estaban conservan su columna', () => {
    const before = rollKeys('999', 'left');
    const after = rollKeys('9.999', 'left');
    expect(before).toEqual(['d0', 'd1', 'd2']);
    // Entra un dígito y un separador; los tres primeros dígitos no cambian de nombre
    expect(after).toEqual(['d0', 's1.', 'd1', 'd2', 'd3']);
  });
});

describe('RollingDigits', () => {
  const advance = async (ms: number) => {
    for (let t = 0; t < ms; t += 16) {
      await act(async () => { jest.advanceTimersByTime(16); });
    }
  };
  const digitAt = (key: string) =>
    screen.getByTestId(`saldo-${key}`, { includeHiddenElements: true }).props.children;

  it('termina mostrando el valor final, aunque cambie a mitad de camino', async () => {
    jest.useFakeTimers();
    try {
      const view = await render(<RollingDigits text="1.234" style={{ fontSize: 20, lineHeight: 24 }} testID="saldo" />);
      await view.rerender(<RollingDigits text="1.250" style={{ fontSize: 20, lineHeight: 24 }} testID="saldo" />);
      await advance(100);
      await view.rerender(<RollingDigits text="1.287" style={{ fontSize: 20, lineHeight: 24 }} testID="saldo" />);
      await advance(500);

      expect(digitAt('r4')).toBe('1');
      expect(digitAt('r2')).toBe('2');
      expect(digitAt('r1')).toBe('8');
      expect(digitAt('r0')).toBe('7');
      expect(screen.getByTestId('saldo').props.accessibilityLabel).toBe('1.287');
    } finally {
      jest.useRealTimers();
    }
  });

  it('AnimatedAmount en modo odómetro anuncia el monto completo', async () => {
    await render(<AnimatedAmount value={1_150_000} variant="roll" testID="saldo" />);
    expect(screen.getByTestId('saldo').props.accessibilityLabel).toBe('$1.150.000');
    expect(screen.getByTestId('saldo-cifras-r0', { includeHiddenElements: true }).props.children).toBe('0');
  });
});
