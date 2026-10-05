import { describe, expect, it } from '@jest/globals';
import { buildSystemContext, type FinancialContext } from '../src/server/gemini';

const base: FinancialContext = {
  totalBalance: 2_000_000,
  monthlyIncome: 3_000_000,
  monthlyExpenses: 1_200_000,
  topCategories: [{ name: 'Comida', amount: 500_000 }],
  activeGoals: [],
};

describe('contexto que recibe el asistente', () => {
  it('una app antigua (sin campos nuevos) sigue funcionando y no muestra secciones vacías', () => {
    const text = buildSystemContext(base);
    expect(text).toContain('Saldo total: 2000000 pesos');
    expect(text).not.toContain('Deudas');
    expect(text).not.toContain('Suscripciones');
    expect(text).not.toContain('Presupuesto del mes');
  });

  it('incluye deudas, suscripciones, presupuesto y recurrentes cuando la app los envía', () => {
    const text = buildSystemContext({
      ...base,
      openDebts: [
        { personName: 'Ana', direction: 'owed_to_me', remaining: 60_000, dueDate: new Date(2026, 10, 1, 12).toISOString() },
        { personName: 'Banco', direction: 'i_owe', remaining: 500_000, dueDate: null },
      ],
      subscriptions: [
        { name: 'Netflix', monthlyCost: 44_900, nextBillingDate: new Date(2026, 9, 20, 12).toISOString() },
        { name: 'Spotify', monthlyCost: 20_000, nextBillingDate: new Date(2026, 9, 25, 12).toISOString() },
      ],
      budget: { totalLimit: 2_000_000, spent: 1_200_000 },
      recurring: [{ notes: 'Arriendo', type: 'expense', amount: 1_200_000, frequency: 'monthly' }],
    });

    expect(text).toContain('Presupuesto del mes: llevas 1200000 pesos de 2000000 pesos (60%)');
    expect(text).toContain('Ana le debe al usuario: 60000 pesos (vence');
    expect(text).toContain('El usuario le debe a Banco: 500000 pesos');
    expect(text).toContain('Suscripciones (total 64900 pesos al mes)');
    expect(text).toContain('Arriendo: gasto mensual de 1200000 pesos');
  });

  it('limita cada lista a 10 elementos para no enviar mensajes gigantes', () => {
    const subscriptions = Array.from({ length: 25 }, (_, i) => ({
      name: `Servicio ${i + 1}`, monthlyCost: 1000, nextBillingDate: new Date().toISOString(),
    }));
    const text = buildSystemContext({ ...base, subscriptions });
    expect(text).toContain('Servicio 10:');
    expect(text).not.toContain('Servicio 11:');
  });
});
