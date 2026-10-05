import { describe, expect, it } from '@jest/globals';
import { analyzeCategory, analyzeMonth, describeInsight } from '../src/utils/spendingInsights';

const base = { categoryId: 'rest', categoryName: 'Restaurantes', history: [400_000, 400_000, 400_000], daysInMonth: 30 };

describe('gasto inusual por categoría', () => {
  it('avisa cuando ya superaste tu promedio en más de 60%', () => {
    const insight = analyzeCategory({ ...base, spent: 700_000, dayOfMonth: 25 })!;
    expect(insight.kind).toBe('over');
    expect(insight.percentOver).toBe(75);
    expect(describeInsight(insight).body).toBe('Llevas $700.000 este mes, 75% más que tu promedio de $400.000.');
  });

  it('avisa a tiempo si vas a ese ritmo, aunque todavía no te hayas pasado', () => {
    // Día 10 con $250.000 → proyecta $750.000 al mes
    const insight = analyzeCategory({ ...base, spent: 250_000, dayOfMonth: 10 })!;
    expect(insight.kind).toBe('pace');
    expect(Math.round(insight.projected)).toBe(750_000);
    expect(insight.remainingToAverage).toBe(150_000);
    expect(describeInsight(insight).body).toContain('Te quedan $150.000 para no pasarte');
  });

  it('no avisa por ritmo en los primeros días del mes (una sola compra lo distorsiona)', () => {
    expect(analyzeCategory({ ...base, spent: 250_000, dayOfMonth: 3 })).toBeNull();
  });

  it('no avisa con menos de 2 meses de historial ni con diferencias pequeñas', () => {
    expect(analyzeCategory({ ...base, history: [400_000], spent: 900_000, dayOfMonth: 25 })).toBeNull();
    expect(analyzeCategory({ ...base, history: [20_000, 20_000], spent: 40_000, dayOfMonth: 25 })).toBeNull();
  });

  it('un gasto normal no genera alerta', () => {
    expect(analyzeCategory({ ...base, spent: 200_000, dayOfMonth: 15 })).toBeNull();
  });
});

describe('análisis del mes', () => {
  it('lista solo las categorías con alerta, de la más alarmante a la menos', () => {
    const insights = analyzeMonth({
      today: new Date(2026, 9, 25, 12),
      current: [
        { categoryId: 'rest', categoryName: 'Restaurantes', total: 700_000 },
        { categoryId: 'fun', categoryName: 'Ocio', total: 500_000 },
        { categoryId: 'food', categoryName: 'Comida', total: 300_000 },
      ],
      pastMonths: [
        [{ categoryId: 'rest', total: 400_000 }, { categoryId: 'fun', total: 200_000 }, { categoryId: 'food', total: 300_000 }],
        [{ categoryId: 'rest', total: 400_000 }, { categoryId: 'fun', total: 200_000 }, { categoryId: 'food', total: 300_000 }],
      ],
    });
    expect(insights.map((i) => [i.categoryName, i.percentOver])).toEqual([['Ocio', 150], ['Restaurantes', 75]]);
  });
});
