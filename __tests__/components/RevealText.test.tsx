import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { RevealText } from '../../src/components/ui/RevealText';
import { REVEAL } from '../../src/constants/motion';

const TEXT = 'Esta semana gastaste menos en comida y más en transporte';
const LINES = [
  { text: 'Esta semana gastaste menos ', x: 0, y: 0, width: 210, height: 22, ascender: 17, descender: 5, capHeight: 12, xHeight: 9 },
  { text: 'en comida y más en transporte', x: 0, y: 22, width: 230, height: 22, ascender: 17, descender: 5, capHeight: 12, xHeight: 9 },
];

describe('RevealText (J2)', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  const advance = async (ms: number) => {
    for (let t = 0; t < ms; t += 16) {
      await act(async () => { jest.advanceTimersByTime(16); });
    }
  };
  const isHidden = () => StyleSheet.flatten(screen.getByRole('header').props.style).opacity === 0;

  it('revela cada línea y al final muestra el texto real', async () => {
    await render(<RevealText accessibilityRole="header">{TEXT}</RevealText>);
    expect(isHidden()).toBe(true);

    await act(async () => {
      fireEvent(screen.getByRole('header'), 'textLayout', { nativeEvent: { lines: LINES } });
    });
    // Las líneas animadas están ocultas al lector: el título se lee una vez y completo
    expect(screen.getAllByRole('header')).toHaveLength(1);
    expect(screen.getByText('en comida y más en transporte', { includeHiddenElements: true })).toBeTruthy();

    await advance(500 + REVEAL.lineGapMs + 200);
    expect(isHidden()).toBe(false);
    expect(screen.queryByText('en comida y más en transporte', { includeHiddenElements: true })).toBeNull();
  });

  it('si nunca se puede medir, el texto aparece igual', async () => {
    await render(<RevealText accessibilityRole="header">{TEXT}</RevealText>);
    expect(isHidden()).toBe(true);
    await advance(REVEAL.failsafeMs + 100);
    expect(isHidden()).toBe(false);
  });
});
