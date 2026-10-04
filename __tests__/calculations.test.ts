import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  getBudgetPercent, getBudgetProgressColor, getBudgetRemaining, getBudgetBarWidth,
} from '../src/utils/budgetCalculations';
import {
  getGoalProgress, getGoalProgressPercentage, getGoalRemainingAmount,
  getGoalDaysRemaining, getGoalWeeklySaving, getGoalMonthlySaving,
} from '../src/utils/goalCalculations';
import { getMonthProgress, projectMonthEnd } from '../src/utils/predictionCalculations';
import {
  getAnnualCost, getTotalMonthlyCost, isUrgent, isUpcoming, calculateNextBillingDate,
} from '../src/utils/subscriptionCalculations';
import { formatCurrency, formatCurrencyCompact } from '../src/utils/currency';
import { convertToCOP } from '../src/services/exchangeRates';
import type { Goal, Subscription } from '../src/models/types';

// Fecha fija para que las pruebas que dependen de "hoy" den siempre igual
const TODAY = new Date(2026, 9, 4, 12); // 4 oct 2026

beforeEach(() => {
  jest.useFakeTimers({ now: TODAY });
});
afterEach(() => {
  jest.useRealTimers();
});

describe('presupuestos', () => {
  it('calcula el porcentaje gastado, incluso si se pasa del 100%', () => {
    expect(getBudgetPercent(400_000, 1_000_000)).toBe(40);
    expect(getBudgetPercent(1_500_000, 1_000_000)).toBe(150);
    expect(getBudgetPercent(100, 0)).toBe(0);
  });

  it('usa el semáforo: verde, naranja desde 80% y rojo desde 100%', () => {
    expect(getBudgetProgressColor(79.9)).toBe('#34C759');
    expect(getBudgetProgressColor(80)).toBe('#FF9500');
    expect(getBudgetProgressColor(100)).toBe('#FF3B30');
  });

  it('el restante nunca es negativo y la barra no pasa del 100%', () => {
    expect(getBudgetRemaining(1_200_000, 1_000_000)).toBe(0);
    expect(getBudgetRemaining(300_000, 1_000_000)).toBe(700_000);
    expect(getBudgetBarWidth(150)).toBe(100);
  });
});

describe('metas de ahorro', () => {
  const goal = (currentAmount: number, targetDate: Date): Goal => ({
    id: 'g', name: 'Viaje', targetAmount: 1_000_000, currentAmount,
    targetDate: targetDate.toISOString(),
  } as Goal);

  it('calcula el progreso sin pasar del 100%', () => {
    expect(getGoalProgressPercentage(goal(250_000, TODAY))).toBe(25);
    expect(getGoalProgress(goal(2_000_000, TODAY))).toBe(1);
    expect(getGoalRemainingAmount(goal(2_000_000, TODAY))).toBe(0);
  });

  it('reparte lo que falta entre las semanas y meses restantes', () => {
    const in70Days = new Date(TODAY.getTime() + 70 * 86_400_000);
    const g = goal(300_000, in70Days);
    expect(getGoalDaysRemaining(g)).toBe(70);
    expect(getGoalWeeklySaving(g)).toBeCloseTo(70_000);   // 700.000 / 10 semanas
    expect(getGoalMonthlySaving(g)).toBeCloseTo(300_000); // 700.000 / 2,33 meses
  });

  it('si la fecha ya pasó, no pide ahorro semanal', () => {
    const past = new Date(TODAY.getTime() - 5 * 86_400_000);
    expect(getGoalWeeklySaving(goal(0, past))).toBe(0);
  });
});

describe('predicción del mes', () => {
  it('sabe en qué parte del mes estamos', () => {
    expect(getMonthProgress(new Date(2026, 1, 14))).toEqual({ dayOfMonth: 14, daysInMonth: 28, percentElapsed: 50 });
  });

  it('proyecta el gasto al mismo ritmo hasta fin de mes', () => {
    expect(projectMonthEnd(600_000, 10, 30)).toBe(1_800_000);
    expect(projectMonthEnd(600_000, 0, 30)).toBe(0);
  });
});

describe('suscripciones', () => {
  const sub = (frequency: Subscription['frequency'], amount: number, daysUntil = 10): Subscription => ({
    id: 's', name: 'Netflix', amount, frequency,
    nextBillingDate: new Date(TODAY.getTime() + daysUntil * 86_400_000).toISOString(),
  } as Subscription);

  it('calcula el costo anual según la frecuencia', () => {
    expect(getAnnualCost(sub('weekly', 10_000))).toBe(520_000);
    expect(getAnnualCost(sub('monthly', 40_000))).toBe(480_000);
    expect(getAnnualCost(sub('quarterly', 90_000))).toBe(360_000);
    expect(getAnnualCost(sub('annual', 200_000))).toBe(200_000);
    expect(getTotalMonthlyCost([sub('monthly', 40_000), sub('annual', 120_000)])).toBe(50_000);
  });

  it('marca como urgente a 3 días y próxima a 7 días', () => {
    expect(isUrgent(sub('monthly', 1, 3))).toBe(true);
    expect(isUrgent(sub('monthly', 1, 4))).toBe(false);
    expect(isUpcoming(sub('monthly', 1, 7))).toBe(true);
    expect(isUpcoming(sub('monthly', 1, 8))).toBe(false);
  });

  it('la siguiente fecha de cobro mensual no se desborda en meses cortos', () => {
    // 31 ene + 1 mes debe ser 28 feb, no 3 de marzo
    const next = new Date(calculateNextBillingDate('monthly', new Date(2026, 0, 31, 12)));
    expect([next.getMonth(), next.getDate()]).toEqual([1, 28]);
  });

  it('la siguiente fecha anual respeta el 29 de febrero', () => {
    const next = new Date(calculateNextBillingDate('annual', new Date(2028, 1, 29, 12)));
    expect([next.getFullYear(), next.getMonth(), next.getDate()]).toEqual([2029, 1, 28]);
  });
});

describe('formato de dinero y monedas', () => {
  it('usa puntos de miles al estilo colombiano', () => {
    expect(formatCurrency(3_500_000)).toBe('$3.500.000');
    expect(formatCurrency(1234.6)).toBe('$1.235');
  });

  it('abrevia millones y miles', () => {
    expect(formatCurrencyCompact(3_500_000)).toBe('$3.5M');
    expect(formatCurrencyCompact(150_000)).toBe('$150K');
    expect(formatCurrencyCompact(900)).toBe('$900');
  });

  it('convierte otras monedas a pesos con la tasa configurada', () => {
    expect(convertToCOP(100, 'USD', { USD: 4_000 })).toBe(400_000);
    expect(convertToCOP(100, 'COP', { USD: 4_000 })).toBe(100);
  });
});
