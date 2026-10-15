import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { CurtainProvider, useCurtain } from '../../src/context/CurtainContext';
import { CURTAIN } from '../../src/constants/motion';

type Run = ReturnType<typeof useCurtain>;

describe('BrandCurtain (J1)', () => {
  let run: Run;
  function Grab() {
    run = useCurtain();
    return null;
  }

  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  const advance = async (ms: number) => {
    for (let t = 0; t < ms; t += 16) {
      await act(async () => { jest.advanceTimersByTime(16); });
    }
  };
  const blocksTouches = () =>
    screen.getByTestId('cortina', { includeHiddenElements: true }).props.pointerEvents === 'auto';

  it('cubre, cambia la pantalla una sola vez y se abre', async () => {
    await render(<CurtainProvider><Grab /></CurtainProvider>);
    const swap = jest.fn<() => void>();
    let done = false;
    await act(async () => { run(swap).then(() => { done = true; }); });

    expect(blocksTouches()).toBe(true);
    await advance(600); // entrada (450 ms + 60 ms entre paneles)
    expect(swap).toHaveBeenCalledTimes(1);

    await advance(700); // salida (500 ms + 60 ms)
    expect(blocksTouches()).toBe(false);
    expect(done).toBe(true);
    expect(swap).toHaveBeenCalledTimes(1);
  });

  it('si la pantalla nueva nunca llega, se abre sola a los 5 s', async () => {
    await render(<CurtainProvider><Grab /></CurtainProvider>);
    let done = false;
    await act(async () => { run(() => new Promise<void>(() => {})).then(() => { done = true; }); });

    await advance(600);
    expect(blocksTouches()).toBe(true);
    await advance(CURTAIN.failsafeMs - 200);
    expect(done).toBe(false);

    await advance(1000);
    expect(blocksTouches()).toBe(false);
    expect(done).toBe(true);
  });

  it('sin proveedor, el cambio se aplica directo', async () => {
    await render(<Grab />);
    const swap = jest.fn<() => void>();
    await act(async () => { await run(swap); });
    expect(swap).toHaveBeenCalledTimes(1);
  });
});
