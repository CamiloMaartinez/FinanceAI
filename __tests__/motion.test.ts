import { describe, expect, it } from '@jest/globals';
import { STAGGER_MAX, STAGGER_MS, staggerDelay, staggerEntering } from '../src/constants/motion';

describe('cascada (A6, B6)', () => {
  it('separa cada elemento 40 ms', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(1)).toBe(STAGGER_MS);
    expect(staggerDelay(3)).toBe(3 * STAGGER_MS);
  });

  it('solo escalona los primeros 8: los demás entran con el último', () => {
    const last = (STAGGER_MAX - 1) * STAGGER_MS;
    expect(staggerDelay(STAGGER_MAX - 1)).toBe(last);
    expect(staggerDelay(STAGGER_MAX)).toBe(last);
    expect(staggerDelay(40)).toBe(last);
  });

  it('el builder lleva el retraso calculado', () => {
    expect(staggerEntering(2).getDelay()).toBe(2 * STAGGER_MS);
    expect(staggerEntering(12, 'pop').getDelay()).toBe((STAGGER_MAX - 1) * STAGGER_MS);
  });
});
