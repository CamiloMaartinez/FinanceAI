import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type * as DbModule from '../src/database/db';

let db: typeof DbModule;
let goalId: string;
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

beforeEach(async () => {
  jest.resetModules();
  db = require('../src/database/db');
  await db.createGoal('Viaje', 1_000_000, day(2027, 6, 1).toISOString(), 'high', '#00f', 'airplane');
  goalId = (await db.getAllGoals())[0].id;
});

const goal = async () => (await db.getAllGoals()).find((g) => g.id === goalId);

describe('aportes automáticos a metas', () => {
  it('queda programado para la siguiente quincena, no para hoy', async () => {
    await db.createGoalAutoContribution(goalId, 100_000, 'biweekly', day(2026, 10, 1));
    const [auto] = await db.getGoalAutoContributions();
    expect(new Date(auto.nextDate)).toEqual(day(2026, 10, 15));
  });

  it('aplica los aportes vencidos al abrir la app', async () => {
    await db.createGoalAutoContribution(goalId, 100_000, 'biweekly', day(2026, 10, 1));
    expect(await db.processDueGoalContributions(day(2026, 11, 1))).toBe(2); // 15 y 29 oct
    expect((await goal())?.currentAmount).toBe(200_000);
    const [auto] = await db.getGoalAutoContributions();
    expect(new Date(auto.nextDate)).toEqual(day(2026, 11, 12));
  });

  it('no aplica dos veces el mismo aporte', async () => {
    await db.createGoalAutoContribution(goalId, 100_000, 'monthly', day(2026, 9, 5));
    await db.processDueGoalContributions(day(2026, 10, 6));
    expect(await db.processDueGoalContributions(day(2026, 10, 6))).toBe(0);
    expect((await goal())?.currentAmount).toBe(100_000);
  });

  it('se detiene solo cuando la meta se completa', async () => {
    await db.createGoalAutoContribution(goalId, 400_000, 'weekly', day(2026, 1, 1));
    const applied = await db.processDueGoalContributions(day(2026, 12, 31));
    expect(applied).toBe(3); // 400k + 400k + 400k ≥ 1.000.000
    expect(await goal()).toBeUndefined(); // completada: ya no está entre las activas
    expect(await db.getGoalAutoContributions()).toHaveLength(0);
  });

  it('crear otro aporte para la misma meta reemplaza el anterior', async () => {
    await db.createGoalAutoContribution(goalId, 100_000, 'monthly', day(2026, 10, 1));
    await db.createGoalAutoContribution(goalId, 50_000, 'weekly', day(2026, 10, 1));
    const autos = await db.getGoalAutoContributions();
    expect(autos).toHaveLength(1);
    expect(autos[0]).toMatchObject({ amount: 50_000, frequency: 'weekly' });
  });

  it('detenerlo o borrar la meta corta los aportes', async () => {
    await db.createGoalAutoContribution(goalId, 100_000, 'weekly', day(2026, 10, 1));
    const [auto] = await db.getGoalAutoContributions();
    await db.deleteGoalAutoContribution(auto.id);
    expect(await db.processDueGoalContributions(day(2026, 12, 1))).toBe(0);

    await db.createGoalAutoContribution(goalId, 100_000, 'weekly', day(2026, 10, 1));
    await db.deleteGoal(goalId);
    expect(await db.getGoalAutoContributions()).toHaveLength(0);
  });

  it('rechaza montos en cero', async () => {
    await expect(db.createGoalAutoContribution(goalId, 0, 'weekly')).rejects.toThrow('mayor que cero');
  });
});
