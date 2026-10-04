import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type * as RatesModule from '../src/services/exchangeRates';

// Respuesta real de open.er-api.com (recortada): unidades por 1 USD
const API_OK = { result: 'success', rates: { USD: 1, COP: 3311.64, EUR: 0.888786 } };

let rates: typeof RatesModule;
let fetchMock: jest.Mock<(...args: unknown[]) => Promise<unknown>>;

function respond(body: unknown, ok = true) {
  fetchMock.mockResolvedValue({ ok, json: async () => body });
}

beforeEach(() => {
  jest.resetModules();
  rates = require('../src/services/exchangeRates');
  fetchMock = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('convertir la respuesta de la API', () => {
  it('calcula cuántos pesos vale 1 USD y 1 EUR', () => {
    const r = rates.ratesFromApiResponse(API_OK)!;
    expect(r.USD).toBeCloseTo(3311.64);
    expect(r.EUR).toBeCloseTo(3726.03, 1); // 3311,64 / 0,888786
  });

  it.each([
    ['error de la API', { result: 'error' }],
    ['sin COP', { result: 'success', rates: { USD: 1, EUR: 0.9 } }],
    ['tasa en cero', { result: 'success', rates: { USD: 1, COP: 3300, EUR: 0 } }],
    ['respuesta vacía', null],
  ])('rechaza: %s', (_name, body) => {
    expect(rates.ratesFromApiResponse(body)).toBeNull();
  });
});

describe('actualización automática', () => {
  it('descarga y guarda las tasas del día', async () => {
    respond(API_OK);
    expect(await rates.refreshExchangeRates()).toBe('updated');
    expect((await rates.getExchangeRates()).USD).toBeCloseTo(3311.64);
    expect((await rates.getExchangeRatesMeta()).updatedAt).not.toBeNull();
  });

  it('no vuelve a consultar antes de 12 horas', async () => {
    respond(API_OK);
    const now = new Date(2026, 9, 4, 8);
    await rates.refreshExchangeRates({ now });
    expect(await rates.refreshExchangeRates({ now: new Date(2026, 9, 4, 19) })).toBe('skipped-recent');
    expect(await rates.refreshExchangeRates({ now: new Date(2026, 9, 4, 21) })).toBe('updated');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('"Actualizar ahora" consulta aunque sea reciente', async () => {
    respond(API_OK);
    await rates.refreshExchangeRates();
    expect(await rates.refreshExchangeRates({ force: true })).toBe('updated');
  });

  it('sin internet conserva las últimas tasas', async () => {
    respond(API_OK);
    await rates.refreshExchangeRates();
    fetchMock.mockRejectedValue(new Error('Network request failed'));
    expect(await rates.refreshExchangeRates({ force: true })).toBe('failed');
    expect((await rates.getExchangeRates()).USD).toBeCloseTo(3311.64);
  });

  it('si la API responde con error, no cambia nada', async () => {
    respond({}, false);
    expect(await rates.refreshExchangeRates()).toBe('failed');
    expect((await rates.getExchangeRates()).USD).toBe(4000); // valor de respaldo
  });

  it('en modo manual nunca sobrescribe las tasas del usuario', async () => {
    await rates.setAutoExchangeRates(false);
    await rates.setExchangeRate('USD', 4100);
    respond(API_OK);
    expect(await rates.refreshExchangeRates({ force: true })).toBe('skipped-manual');
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await rates.getExchangeRates()).USD).toBe(4100);
  });
});
