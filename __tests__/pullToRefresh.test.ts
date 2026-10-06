import { describe, expect, it } from '@jest/globals';
import { pullOffset, pullProgress, shouldRefresh } from '../src/utils/pullToRefresh';

describe('pull-to-refresh', () => {
  it('la moneda se llena en proporción a lo jalado y se detiene en el umbral', () => {
    expect(pullProgress(0, 80)).toBe(0);
    expect(pullProgress(40, 80)).toBe(0.5);
    expect(pullProgress(200, 80)).toBe(1);
    expect(pullProgress(-20, 80)).toBe(0);
  });

  it('recarga solo si se soltó pasado el umbral y no hay otra recarga', () => {
    expect(shouldRefresh(79, 80, false)).toBe(false);
    expect(shouldRefresh(80, 80, false)).toBe(true);
    expect(shouldRefresh(120, 80, true)).toBe(false);
  });

  it('mientras el scroll de iOS rebota, el hueco de la moneda no cambia de alto', () => {
    // Soltó a 120: el rebote nativo ya pone todo el desplazamiento
    expect(pullOffset(120, 0, 64)).toBe(0);
    // El scroll vuelve hacia 0: el contenido compensa lo que falta hasta 64
    expect(40 + pullOffset(40, 0, 64)).toBe(64);
    expect(pullOffset(0, 0, 64)).toBe(64);
    // Android: todo el jalón viene del gesto
    expect(pullOffset(0, 100, 64)).toBe(100);
    expect(pullOffset(0, 0, 0)).toBe(0);
  });
});
