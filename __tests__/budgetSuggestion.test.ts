import { describe, expect, it } from '@jest/globals';
import {
  averageCategorySpending, baselineSuggestion, sanitizeBudgetSuggestion, extractJsonObject, roundUpToThousand,
} from '../src/utils/budgetSuggestion';

const history = averageCategorySpending([
  { income: 3_000_000, categories: [{ categoryId: 'food', name: 'Comida', total: 600_000 }, { categoryId: 'fun', name: 'Ocio', total: 300_000 }] },
  { income: 3_000_000, categories: [{ categoryId: 'food', name: 'Comida', total: 500_000 }, { categoryId: 'fun', name: 'Ocio', total: 100_000 }] },
  { income: 0, categories: [] }, // mes sin datos: no debe bajar el promedio
]);

describe('promedio de gasto', () => {
  it('promedia solo los meses con datos y ordena de mayor a menor', () => {
    expect(history.monthsAnalyzed).toBe(2);
    expect(history.monthlyIncome).toBe(3_000_000);
    expect(history.categories).toEqual([
      { categoryId: 'food', name: 'Comida', monthlyAverage: 550_000 },
      { categoryId: 'fun', name: 'Ocio', monthlyAverage: 200_000 },
    ]);
  });

  it('el respaldo sin IA limita cada categoría a su promedio redondeado', () => {
    expect(roundUpToThousand(187_350)).toBe(188_000);
    const s = baselineSuggestion(history);
    expect(s).toMatchObject({ totalLimit: 750_000, categoryLimits: { food: 550_000, fun: 200_000 }, source: 'baseline' });
    expect(s.explanation).toContain('últimos 2 meses');
  });
});

describe('validar la respuesta de la IA', () => {
  it('acepta una propuesta razonable y redondea a miles', () => {
    const s = sanitizeBudgetSuggestion(
      { totalLimit: 700_000, categoryLimits: { food: 540_500, fun: 150_000 }, explanation: 'Recorta ocio.' },
      history
    );
    expect(s).toEqual({ totalLimit: 700_000, categoryLimits: { food: 541_000, fun: 150_000 }, explanation: 'Recorta ocio.', source: 'ai' });
  });

  it('descarta categorías inventadas y montos absurdos', () => {
    const s = sanitizeBudgetSuggestion(
      { totalLimit: 9_000_000, categoryLimits: { food: 500_000, fun: 5_000_000, viajes: 100_000, otra: -1 } },
      history
    );
    expect(s.categoryLimits).toEqual({ food: 500_000 });
  });

  it('si el total no alcanza para las categorías, usa la suma', () => {
    const s = sanitizeBudgetSuggestion({ totalLimit: 100, categoryLimits: { food: 500_000, fun: 150_000 } }, history);
    expect(s.totalLimit).toBe(650_000);
  });

  it.each([[null], ['texto'], [{ categoryLimits: {} }], [{ categoryLimits: { inventada: 1000 } }]])(
    'una respuesta inservible (%j) cae al respaldo',
    (raw) => {
      expect(sanitizeBudgetSuggestion(raw, history).source).toBe('baseline');
    }
  );
});

describe('leer JSON de la respuesta', () => {
  it('lo encuentra aunque venga en un bloque de código o con texto antes', () => {
    expect(extractJsonObject('Aquí está:\n```json\n{"totalLimit": 1}\n```')).toEqual({ totalLimit: 1 });
    expect(extractJsonObject('sin json')).toBeNull();
    expect(extractJsonObject('{roto')).toBeNull();
  });
});
