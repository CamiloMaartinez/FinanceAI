import { describe, expect, it } from '@jest/globals';
import { buildTour, cleanName, firstName, MAX_TOUR_FEATURES } from '../src/utils/onboardingPlan';

const ids = (interests: Parameters<typeof buildTour>[0]) => buildTour(interests).map((f) => f.id);

describe('buildTour', () => {
  it('sin intereses muestra lo esencial', () => {
    expect(ids([])).toEqual(['movimientos', 'presupuestos', 'metas', 'asistente', 'seguridad']);
  });

  it('pone primero lo que pidió y siempre incluye el asistente', () => {
    expect(ids(['suscripciones'])).toEqual(['movimientos', 'suscripciones', 'asistente', 'seguridad']);
  });

  it('respeta el orden de la lista aunque se elija en otro orden y no repite', () => {
    expect(ids(['ia', 'gastos'])).toEqual(['movimientos', 'presupuestos', 'informes', 'asistente', 'seguridad']);
  });

  it('nunca pasa del tope de diapositivas', () => {
    const all = buildTour(['gastos', 'ahorro', 'deudas', 'suscripciones', 'inversion', 'ia']);
    expect(all).toHaveLength(MAX_TOUR_FEATURES);
    expect(all[0].id).toBe('movimientos');
  });
});

describe('nombres', () => {
  it('limpia espacios y toma el primer nombre', () => {
    expect(cleanName('  Juan   Camilo ')).toBe('Juan Camilo');
    expect(firstName('Juan Camilo')).toBe('Juan');
    expect(firstName('   ')).toBe('');
  });
});
