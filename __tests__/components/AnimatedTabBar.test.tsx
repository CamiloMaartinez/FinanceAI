import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AnimatedTabBar } from '../../src/components/navigation/AnimatedTabBar';

function setup(focusedIndex: number, preventDefault = false) {
  const routes = [
    { key: 'index-1', name: 'index', params: undefined },
    { key: 'reports-1', name: 'reports', params: undefined },
    { key: 'more-1', name: '(more)', params: undefined },
    { key: 'budgets-1', name: 'budgets', params: undefined }, // oculta (href: null)
  ];
  const descriptors = Object.fromEntries(routes.map((r) => [r.key, {
    options: {
      title: { index: 'Inicio', reports: 'Reportes', '(more)': 'Más', budgets: 'Presupuestos' }[r.name],
      tabBarIcon: () => null,
      tabBarItemStyle: r.name === 'budgets' ? { display: 'none' } : undefined,
    },
  }]));
  const navigation = {
    emit: jest.fn(() => ({ defaultPrevented: preventDefault })),
    navigate: jest.fn(),
  };
  const props = {
    state: { index: focusedIndex, routes, key: 'tabs', routeNames: routes.map((r) => r.name), type: 'tab', stale: false, history: [], preloadedRouteKeys: [] },
    descriptors,
    navigation,
    insets: { top: 0, bottom: 34, left: 0, right: 0 },
  } as any;
  return { props, navigation };
}

describe('AnimatedTabBar', () => {
  it('no muestra las pestañas ocultas y marca la activa con su etiqueta', async () => {
    const { props } = setup(0);
    await render(<AnimatedTabBar {...props} />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.queryByRole('tab', { name: 'Presupuestos' })).toBeNull();
    expect(screen.getByRole('tab', { name: 'Inicio' }).props.accessibilityState).toEqual({ selected: true });
    // Solo la activa muestra su etiqueta
    expect(screen.getByText('Inicio')).toBeTruthy();
    expect(screen.queryByText('Reportes')).toBeNull();
  });

  it('emite tabPress y navega a otra pestaña', async () => {
    const { props, navigation } = setup(0);
    await render(<AnimatedTabBar {...props} />);
    await fireEvent.press(screen.getByRole('tab', { name: 'Reportes' }));
    expect(navigation.emit).toHaveBeenCalledWith({ type: 'tabPress', target: 'reports-1', canPreventDefault: true });
    expect(navigation.navigate).toHaveBeenCalledWith('reports', undefined);
  });

  it('respeta preventDefault de tabPress', async () => {
    const { props, navigation } = setup(0, true);
    await render(<AnimatedTabBar {...props} />);
    await fireEvent.press(screen.getByRole('tab', { name: 'Reportes' }));
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('en una pantalla oculta resalta "Más"', async () => {
    const { props } = setup(3);
    await render(<AnimatedTabBar {...props} />);
    expect(screen.getByRole('tab', { name: 'Más' }).props.accessibilityState).toEqual({ selected: true });
  });
});
