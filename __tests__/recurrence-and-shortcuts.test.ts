import { describe, expect, it } from '@jest/globals';
import { nextOccurrence, dueOccurrences, MAX_CATCH_UP } from '../src/utils/recurrence';
import { parseShortcutAmount } from '../src/utils/shortcutParams';

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

describe('siguiente repetición', () => {
  it.each([
    ['31 ene → 28 feb', day(2026, 1, 31), 31, day(2026, 2, 28)],
    ['28 feb vuelve al 31 en marzo', day(2026, 2, 28), 31, day(2026, 3, 31)],
    ['diciembre pasa al año siguiente', day(2026, 12, 15), 15, day(2027, 1, 15)],
    ['año bisiesto: 29 feb', day(2028, 1, 30), 30, day(2028, 2, 29)],
  ])('mensual: %s', (_name, from, anchor, expected) => {
    expect(nextOccurrence(from, 'monthly', anchor)).toEqual(expected);
  });

  it('semanal suma 7 días y quincenal 14', () => {
    expect(nextOccurrence(day(2026, 10, 1), 'weekly', 1)).toEqual(day(2026, 10, 8));
    expect(nextOccurrence(day(2026, 10, 1), 'biweekly', 1)).toEqual(day(2026, 10, 15));
  });
});

describe('repeticiones pendientes', () => {
  it('devuelve las fechas vencidas y la siguiente futura', () => {
    const { due, next } = dueOccurrences(day(2026, 7, 15), 'monthly', 15, day(2026, 10, 4));
    expect(due).toEqual([day(2026, 7, 15), day(2026, 8, 15), day(2026, 9, 15)]);
    expect(next).toEqual(day(2026, 10, 15));
  });

  it(`no crea más de ${MAX_CATCH_UP} de una vez, pero deja la siguiente en el futuro`, () => {
    const now = day(2026, 10, 4);
    const { due, next } = dueOccurrences(day(2020, 1, 1), 'weekly', 1, now);
    expect(due).toHaveLength(MAX_CATCH_UP);
    expect(next.getTime()).toBeGreaterThan(now.getTime());
  });

  it('no hay pendientes si la fecha es futura', () => {
    expect(dueOccurrences(day(2026, 11, 1), 'monthly', 1, day(2026, 10, 4)).due).toHaveLength(0);
  });
});

describe('monto que llega desde un atajo de Siri', () => {
  it.each([
    ['$25.000', 25_000],
    ['25.000,50', 25_000.5],
    ['25,000.50', 25_000.5],
    ['COP 25000', 25_000],
    ['1.250.000', 1_250_000],
    ['12,5', 12.5],
    ['12.50', 12.5],
  ])('%s → %d', (raw, expected) => {
    expect(parseShortcutAmount(raw)).toBe(expected);
  });

  it.each([[''], ['abc'], ['$ 0'], [undefined]])('"%s" no es un monto válido', (raw) => {
    expect(parseShortcutAmount(raw)).toBeNull();
  });
});
