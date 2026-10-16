import { describe, expect, it } from '@jest/globals';
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { useSharedValue } from 'react-native-reanimated';
import { RatesTicker, tickerItems } from '../../src/components/dashboard/RatesTicker';
import { AmbientBackground } from '../../src/components/ui/AmbientBackground';

describe('cinta de tasas (J5)', () => {
  it('arma una vuelta con USD y EUR en pesos', () => {
    expect(tickerItems({ USD: 3950.4, EUR: 4312 })).toEqual([
      { code: 'USD', value: '$3.950' },
      { code: 'EUR', value: '$4.312' },
    ]);
    // Una tasa vacía no se muestra
    expect(tickerItems({ USD: 0, EUR: 4312 })).toEqual([{ code: 'EUR', value: '$4.312' }]);
  });

  it('se lee una sola vez, como un texto completo', async () => {
    function Host() {
      const scrollY = useSharedValue(0);
      return <RatesTicker scrollY={scrollY} />;
    }
    await render(<Host />);
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    // Sin tasas guardadas se usan las de respaldo (4.000 y 4.300)
    expect(screen.getByTestId('cinta-tasas').props.accessibilityLabel).toBe(
      'Tasas de cambio: 1 USD vale $4.000 pesos, 1 EUR vale $4.300 pesos',
    );
  });
});

describe('fondo ambiental (J4)', () => {
  it('es decorativo: no recibe toques ni se anuncia', async () => {
    await render(<AmbientBackground />);
    const bg = screen.getByTestId('fondo-ambiental', { includeHiddenElements: true });
    expect(bg.props.pointerEvents).toBe('none');
    expect(bg.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});
