import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet, Text as RNText } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AmountText, splitAmount } from '../../src/components/ui/AmountText';
import { Chip } from '../../src/components/ui/Chip';
import { CircleAction } from '../../src/components/ui/CircleAction';
import { BottomSheetCard } from '../../src/components/ui/BottomSheetCard';
import { IconBadge } from '../../src/components/ui/IconBadge';
import { Text } from '../../src/components/ui/Text';
import { fonts, fontForWeight } from '../../src/constants/theme';

describe('splitAmount', () => {
  it('pesos: miles con punto y sin decimales', () => {
    expect(splitAmount(3500000)).toEqual({ sign: '', symbol: '$', integer: '3.500.000', fraction: '' });
  });

  it('dólares y euros: dos decimales con coma', () => {
    expect(splitAmount(1284.5, 'USD')).toEqual({ sign: '', symbol: 'US$', integer: '1.284', fraction: ',50' });
    expect(splitAmount(0.999, 'EUR')).toMatchObject({ integer: '1', fraction: ',00' });
  });

  it('signo: menos para negativos y más solo si se pide', () => {
    expect(splitAmount(-25000).sign).toBe('−');
    expect(splitAmount(25000).sign).toBe('');
    expect(splitAmount(25000, 'COP', { showSign: true }).sign).toBe('+');
    // Cero nunca lleva signo, aunque venga de un -0,4 redondeado
    expect(splitAmount(-0.4, 'COP', { showSign: true }).sign).toBe('');
  });
});

describe('AmountText', () => {
  it('anuncia el monto completo a los lectores de pantalla', async () => {
    await render(<AmountText value={1284.5} currency="USD" testID="monto" />);
    expect(screen.getByTestId('monto').props.accessibilityLabel).toBe('US$1.284,50');
    expect(screen.getByText(',50')).toBeTruthy();
  });
});

describe('Chip', () => {
  it('llama a onPress y expone si está seleccionado', async () => {
    const onPress = jest.fn();
    await render(<Chip label="7d" accessibilityLabel="7 días" selected onPress={onPress} />);
    const chip = screen.getByRole('button', { name: '7 días' });
    expect(chip.props.accessibilityState).toEqual({ selected: true });
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('CircleAction', () => {
  it('muestra la etiqueta y responde al toque', async () => {
    const onPress = jest.fn();
    await render(<CircleAction icon="arrow-down" label="Ingreso" onPress={onPress} />);
    expect(screen.getByText('Ingreso')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Ingreso' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('sin etiqueta visible sigue teniendo nombre accesible', async () => {
    await render(<CircleAction icon="swap-horizontal" label="Transferir" showLabel={false} onPress={() => {}} />);
    expect(screen.queryByText('Transferir')).toBeNull();
    expect(screen.getByRole('button', { name: 'Transferir' })).toBeTruthy();
  });

  it('deshabilitado no dispara la acción', async () => {
    const onPress = jest.fn();
    await render(<CircleAction icon="arrow-up" label="Gasto" disabled onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Gasto' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('BottomSheetCard e IconBadge', () => {
  it('pintan su contenido', async () => {
    await render(
      <BottomSheetCard>
        <IconBadge icon="cart" />
        <RNText>Movimientos recientes</RNText>
      </BottomSheetCard>
    );
    expect(screen.getByText('Movimientos recientes')).toBeTruthy();
  });
});

describe('Text con Outfit', () => {
  it('convierte fontWeight en la familia del peso y lo quita', async () => {
    await render(<Text style={{ fontWeight: '600', fontSize: 14 }}>Hola</Text>);
    const style = StyleSheet.flatten(screen.getByText('Hola').props.style);
    expect(style.fontFamily).toBe(fonts.semibold);
    expect(style.fontWeight).toBeUndefined();
    expect(style.fontSize).toBe(14);
  });

  it('usa Regular por defecto y respeta familias ajenas', async () => {
    await render(
      <>
        <Text>Normal</Text>
        <Text style={{ fontFamily: 'Menlo', fontWeight: '700' }}>Código</Text>
      </>
    );
    expect(StyleSheet.flatten(screen.getByText('Normal').props.style).fontFamily).toBe(fonts.regular);
    expect(StyleSheet.flatten(screen.getByText('Código').props.style).fontFamily).toBe('Menlo');
  });

  it('fontForWeight cubre números y nombres', () => {
    expect(fontForWeight('200')).toBe(fonts.light);
    expect(fontForWeight(500)).toBe(fonts.medium);
    expect(fontForWeight('bold')).toBe(fonts.bold);
    expect(fontForWeight('900')).toBe(fonts.extrabold);
    expect(fontForWeight(undefined)).toBe(fonts.regular);
  });
});
