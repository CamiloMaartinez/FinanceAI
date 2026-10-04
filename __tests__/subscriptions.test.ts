import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { advanceBillingDate } from '../src/utils/subscriptionCalculations';
import type * as DbModule from '../src/database/db';
import type { BillingFrequency } from '../src/models/types';

const day = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);
const iso = (y: number, m: number, d: number) => day(y, m, d).toISOString();
const dateOf = (s: string | null) => {
  const d = new Date(s!);
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
};

describe('avanzar la fecha de cobro', () => {
  it('no cambia nada si el cobro todavía no llega', () => {
    expect(advanceBillingDate(iso(2026, 10, 20), 'monthly', 20, day(2026, 10, 4))).toBeNull();
  });

  it('el mismo día del cobro todavía no avanza (se muestra "hoy")', () => {
    expect(advanceBillingDate(iso(2026, 10, 4), 'monthly', 4, day(2026, 10, 4, 23))).toBeNull();
  });

  it('al día siguiente del cobro pasa al próximo mes', () => {
    expect(dateOf(advanceBillingDate(iso(2026, 10, 4), 'monthly', 4, day(2026, 10, 5)))).toEqual([2026, 11, 4]);
  });

  it('salta varios períodos si la app no se abrió en meses', () => {
    expect(dateOf(advanceBillingDate(iso(2026, 3, 10), 'monthly', 10, day(2026, 10, 4)))).toEqual([2026, 10, 10]);
  });

  it('respeta el día original: 31 → 28 feb → 31 mar', () => {
    const feb = advanceBillingDate(iso(2026, 1, 31), 'monthly', 31, day(2026, 2, 1));
    expect(dateOf(feb)).toEqual([2026, 2, 28]);
    const mar = advanceBillingDate(feb!, 'monthly', 31, day(2026, 3, 1));
    expect(dateOf(mar)).toEqual([2026, 3, 31]);
  });

  const cases: [string, BillingFrequency, number[]][] = [
    ['semanal', 'weekly', [2026, 10, 7]],
    ['trimestral', 'quarterly', [2026, 12, 30]],
    ['anual', 'annual', [2027, 9, 30]],
  ];
  it.each(cases)('%s', (_name, frequency, expected) => {
    expect(dateOf(advanceBillingDate(iso(2026, 9, 30), frequency, 30, day(2026, 10, 4)))).toEqual(expected);
  });
});

describe('suscripciones en la base de datos', () => {
  let db: typeof DbModule;

  beforeEach(() => {
    jest.resetModules();
    db = require('../src/database/db');
  });

  it('guarda el día original al crear', async () => {
    await db.createSubscription('Netflix', 40_000, 'monthly', iso(2026, 1, 31), '#f00', 'tv');
    const [sub] = await db.getAllSubscriptions();
    expect(sub.anchorDay).toBe(31);
  });

  it('avanza solo las vencidas y devuelve cuáles cambiaron', async () => {
    await db.createSubscription('Netflix', 40_000, 'monthly', iso(2026, 9, 15), '#f00', 'tv');
    await db.createSubscription('Spotify', 20_000, 'monthly', iso(2026, 10, 20), '#0f0', 'music');

    const advanced = await db.advanceDueSubscriptions(day(2026, 10, 4));

    expect(advanced.map((s) => s.name)).toEqual(['Netflix']);
    const subs = await db.getAllSubscriptions();
    expect(dateOf(subs.find((s) => s.name === 'Netflix')!.nextBillingDate)).toEqual([2026, 10, 15]);
    expect(dateOf(subs.find((s) => s.name === 'Spotify')!.nextBillingDate)).toEqual([2026, 10, 20]);
  });

  it('no avanza dos veces el mismo cobro', async () => {
    await db.createSubscription('Netflix', 40_000, 'monthly', iso(2026, 9, 15), '#f00', 'tv');
    await db.advanceDueSubscriptions(day(2026, 10, 4));
    expect(await db.advanceDueSubscriptions(day(2026, 10, 4))).toHaveLength(0);
  });

  it('las suscripciones antiguas sin día original toman el de su fecha actual', async () => {
    await db.createSubscription('Gym', 90_000, 'monthly', iso(2026, 1, 31), '#00f', 'barbell');
    const database = await db.getDb();
    await database.runAsync(`UPDATE subscriptions SET anchorDay = NULL`);

    const [feb] = await db.advanceDueSubscriptions(day(2026, 2, 1));
    expect(feb.anchorDay).toBe(31);
    const [mar] = await db.advanceDueSubscriptions(day(2026, 3, 1));
    expect(dateOf(mar.nextBillingDate)).toEqual([2026, 3, 31]);
  });

  it('ignora las suscripciones eliminadas', async () => {
    const id = await db.createSubscription('Netflix', 40_000, 'monthly', iso(2026, 9, 15), '#f00', 'tv');
    await db.deleteSubscription(id);
    expect(await db.advanceDueSubscriptions(day(2026, 10, 4))).toHaveLength(0);
  });
});
