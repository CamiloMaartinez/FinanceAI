import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { applyAmountKey, amountFromRaw, displayParts, rawFromAmount } from '../../src/utils/amountInput';
import { AmountEntrySheet } from '../../src/components/AmountEntrySheet';
import { SwipeToConfirm } from '../../src/components/ui/SwipeToConfirm';
import { PinPad } from '../../src/components/PinPad';
import { Onboarding } from '../../src/components/Onboarding';
import { getOnboardingInterests, hasSeenOnboarding } from '../../src/services/onboarding';
import { getProfiles } from '../../src/services/profiles';
import { getProfile } from '../../src/services/profile';

const type = (keys: string, decimals = 0) => keys.split('').reduce((raw, k) => applyAmountKey(raw, k === '<' ? 'del' : k, decimals), '');

describe('lógica del teclado de montos', () => {
  it('sin ceros a la izquierda, borra y limita decimales', () => {
    expect(type('00025')).toBe('25');
    expect(type('250<')).toBe('25');
    expect(type('12,345', 2)).toBe('12,34');
    expect(type(',5', 2)).toBe('0,5');
    expect(type('1,2,3', 2)).toBe('1,23');
    // En pesos no hay coma
    expect(type('12,5')).toBe('125');
  });

  it('convierte, muestra con puntos de miles y vuelve al texto', () => {
    expect(amountFromRaw('1284,5')).toBe(1284.5);
    expect(displayParts('1284500,5')).toEqual({ integer: '1.284.500', fraction: ',5' });
    expect(displayParts('')).toEqual({ integer: '0', fraction: '' });
    expect(rawFromAmount(1284.5, 2)).toBe('1284,5');
    expect(rawFromAmount(25000, 0)).toBe('25000');
  });
});

describe('SwipeToConfirm', () => {
  it('se puede activar con el lector de pantalla y no hace nada deshabilitado', async () => {
    const onConfirm = jest.fn();
    const { rerender } = await render(<SwipeToConfirm label="Desliza para pagar" onConfirm={onConfirm} disabled />);
    const swipe = () => screen.getByRole('button', { name: 'Desliza para pagar' });
    await fireEvent(swipe(), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(onConfirm).not.toHaveBeenCalled();

    await rerender(<SwipeToConfirm label="Desliza para pagar" onConfirm={onConfirm} />);
    await fireEvent(swipe(), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('AmountEntrySheet', () => {
  it('escribe el monto, avisa si supera lo disponible y lo confirma', async () => {
    const onConfirm = jest.fn();
    await render(
      <AmountEntrySheet
        visible
        title="Nuevo gasto"
        currency="USD"
        available={10}
        equivalence={(v) => `≈ $${v * 4000} COP`}
        onConfirm={onConfirm}
        onClose={() => {}}
      />
    );
    for (const k of ['1', '2', 'Coma decimal', '5']) await fireEvent.press(screen.getByRole('button', { name: k }));
    expect(screen.getByLabelText('Monto: US$12,50')).toBeTruthy();
    expect(screen.getByText('≈ $50000 COP')).toBeTruthy();
    expect(screen.getByText(/Disponible: US\$10/)).toBeTruthy();

    await fireEvent(screen.getByRole('button', { name: 'Desliza para confirmar' }), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(onConfirm).toHaveBeenCalledWith(12.5);
  });
});

describe('PinPad sobre el teclado compartido', () => {
  it('completa el PIN de 4 dígitos y permite borrar', async () => {
    const onComplete = jest.fn();
    await render(<PinPad onComplete={onComplete} />);
    for (const k of ['1', '2', 'Borrar', '3', '4', '5']) await fireEvent.press(screen.getByRole('button', { name: k }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('1345'));
  });
});

describe('Onboarding', () => {
  it('pregunta nombre e intereses, arma el recorrido y lo guarda al empezar', async () => {
    const onFinish = jest.fn();
    await render(<Onboarding profileId="p-test" onFinish={onFinish} />);
    expect(screen.getByRole('tab', { name: /Página 1 de/ }).props.accessibilityState).toEqual({ selected: true });

    await fireEvent.press(screen.getByRole('button', { name: 'Personalizar' }));
    await fireEvent.changeText(screen.getByLabelText('Tu nombre'), '  Camilo  Martínez ');
    await fireEvent.press(screen.getByRole('button', { name: 'Siguiente' }));

    expect(screen.getByText('Camilo, ¿qué quieres lograr?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Salir de deudas' }));
    expect(screen.getByRole('checkbox', { name: 'Salir de deudas' }).props.accessibilityState).toEqual({ checked: true });
    await fireEvent.press(screen.getByRole('button', { name: 'Siguiente' }));

    // Recorrido: movimientos, deudas, asistente y seguridad, luego el resumen
    expect(screen.getByText('Registra en segundos')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Deudas bajo control')).toBeTruthy();
    for (let i = 0; i < 3; i++) await fireEvent.press(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Todo listo, Camilo')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Saltar la introducción' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Empezar' }));
    await waitFor(() => expect(onFinish).toHaveBeenCalled());
    expect(await hasSeenOnboarding('p-test')).toBe(true);
    expect(await getOnboardingInterests('p-test')).toEqual(['deudas']);
    expect((await getProfiles()).find((p) => p.id === 'p-test')).toBeUndefined();
  });

  it('Saltar la da por vista sin pedir datos', async () => {
    const onFinish = jest.fn();
    await render(<Onboarding profileId="p-skip" onFinish={onFinish} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Saltar la introducción' }));
    await waitFor(() => expect(onFinish).toHaveBeenCalled());
    expect(await hasSeenOnboarding('p-skip')).toBe(true);
  });

  it('en el perfil principal guarda el nombre para el saludo', async () => {
    await render(<Onboarding profileId="default" onFinish={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Personalizar' }));
    await fireEvent.changeText(screen.getByLabelText('Tu nombre'), 'Camilo');
    await fireEvent.press(screen.getByRole('button', { name: 'Saltar la introducción' }));
    await waitFor(async () => expect((await getProfile()).name).toBe('Camilo'));
    expect((await getProfiles())[0].name).toBe('Camilo');
  });
});
