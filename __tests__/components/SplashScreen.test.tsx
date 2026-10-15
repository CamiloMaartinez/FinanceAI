import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { SplashScreen } from '../../src/components/SplashScreen';
import { BOOT_STEPS, bootProgress, formatSplashCount, splashTarget } from '../../src/utils/bootProgress';

describe('bootProgress', () => {
  it('cuenta cada paso una sola vez', () => {
    expect(bootProgress([])).toBe(0);
    expect(bootProgress(['perfil', 'perfil', 'baseDeDatos'])).toBeCloseTo(2 / 6);
    expect(bootProgress([...BOOT_STEPS])).toBe(1);
  });

  it('no llega a 100 hasta que la app está lista', () => {
    expect(splashTarget(1, false)).toBe(0.95);
    expect(splashTarget(0.5, false)).toBe(0.5);
    expect(splashTarget(0.2, true)).toBe(1);
  });

  it('formatea el contador con tres cifras', () => {
    expect(formatSplashCount(0)).toBe('000');
    expect(formatSplashCount(0.07)).toBe('007');
    expect(formatSplashCount(0.5)).toBe('050');
    expect(formatSplashCount(1)).toBe('100');
  });
});

describe('SplashScreen', () => {
  const advance = async (ms: number) => {
    for (let t = 0; t < ms; t += 16) {
      await act(async () => { jest.advanceTimersByTime(16); });
    }
  };
  const count = () =>
    screen.getByTestId('splash-contador', { includeHiddenElements: true }).props.jestAnimatedProps.value.text;

  it('avanza con los pasos, llega a 100 al terminar el arranque y sale', async () => {
    jest.useFakeTimers();
    try {
      const onFinish = jest.fn();
      const view = await render(
        <SplashScreen progress={bootProgress(['perfil', 'baseDeDatos', 'recurrentes'])} ready={false} fontsReady onFinish={onFinish} />,
      );
      await advance(400);
      expect(count()).toBe('050');
      expect(onFinish).not.toHaveBeenCalled();

      await view.rerender(<SplashScreen progress={1} ready fontsReady onFinish={onFinish} />);
      await advance(400);
      expect(count()).toBe('100');

      // Fundido + cortina, dentro del tope de 1,6 s
      await advance(1300);
      expect(onFinish).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('se anuncia una sola vez como "Cargando Smart Finance"', async () => {
    await render(<SplashScreen progress={0} ready={false} fontsReady={false} onFinish={() => {}} />);
    expect(screen.getByTestId('splash').props.accessibilityLabel).toBe('Cargando Smart Finance');
  });
});
