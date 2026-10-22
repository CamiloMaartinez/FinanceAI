import { describe, expect, it } from '@jest/globals';
import { findByName, buildShortcutPrefill, quickSaveInput } from '../src/utils/shortcutParams';

const accounts = [
  { id: 'bc', name: 'Bancolombia *1234' },
  { id: 'nq', name: 'Nequi' },
  { id: 'ef', name: 'Efectivo' },
];
const categories = [
  { id: 'cat-alimentacion', name: 'Alimentación' },
  { id: 'cat-transporte', name: 'Transporte' },
  { id: 'cat-tecnologia', name: 'Tecnología' },
];

describe('findByName', () => {
  it.each([
    ['nq', 'nq'],
    ['Nequi', 'nq'],
    ['nequi', 'nq'],
    ['  NEQUI ', 'nq'],
    ['Bancolombia', 'bc'],
    ['bancolombia 1234', 'bc'],
    ['Bancolombia *1234', 'bc'],
  ])('"%s" → %s', (value, id) => {
    expect(findByName(value, accounts)?.id).toBe(id);
  });

  it('ignora tildes en la categoría', () => {
    expect(findByName('alimentacion', categories)?.id).toBe('cat-alimentacion');
    expect(findByName('Tecnologia', categories)?.id).toBe('cat-tecnologia');
  });

  it('no adivina si hay dos opciones o ninguna', () => {
    const two = [{ id: 'a', name: 'Nu Ahorro' }, { id: 'b', name: 'Nu Tarjeta' }];
    expect(findByName('Nu', two)).toBeUndefined();
    expect(findByName('Daviplata', accounts)).toBeUndefined();
    expect(findByName('', accounts)).toBeUndefined();
    expect(findByName(undefined, accounts)).toBeUndefined();
  });
});

describe('buildShortcutPrefill', () => {
  it('arma un gasto con cuenta y categoría por nombre', () => {
    expect(buildShortcutPrefill(
      { tipo: 'gasto', monto: '25.000', cuenta: 'Nequi', categoria: 'Alimentacion', nota: 'Almuerzo' },
      accounts, categories
    )).toEqual({
      type: 'expense', amount: 25000, notes: 'Almuerzo', accountId: 'nq',
      toAccountId: undefined, categoryId: 'cat-alimentacion',
    });
  });

  it('la nota vacía queda sin nota', () => {
    expect(buildShortcutPrefill({ monto: '5000', nota: '  ' }, accounts, categories).notes).toBeUndefined();
  });

  it('un ingreso no lleva categoría', () => {
    const p = buildShortcutPrefill({ tipo: 'ingreso', monto: '100000', cuenta: 'nequi', categoria: 'Transporte' }, accounts, categories);
    expect(p.type).toBe('income');
    expect(p.categoryId).toBeUndefined();
  });
});

describe('quickSaveInput', () => {
  const now = new Date('2026-10-22T12:00:00.000Z');

  it('guarda cuando hay monto, cuenta y categoría; sin nota usa la categoría', () => {
    const input = quickSaveInput(
      { type: 'expense', amount: 18000, accountId: 'nq', categoryId: 'cat-transporte' }, categories, now
    );
    expect(input).toEqual({
      amount: 18000, type: 'expense', date: now.toISOString(), accountId: 'nq',
      toAccountId: null, categoryId: 'cat-transporte', notes: 'Transporte',
    });
  });

  it('respeta la nota cuando viene', () => {
    expect(quickSaveInput(
      { type: 'expense', amount: 18000, accountId: 'nq', categoryId: 'cat-transporte', notes: 'Uber' }, categories, now
    )?.notes).toBe('Uber');
  });

  it('abre el formulario si falta algo', () => {
    expect(quickSaveInput({ type: 'expense', amount: 18000, accountId: 'nq' }, categories, now)).toBeNull();
    expect(quickSaveInput({ type: 'expense', accountId: 'nq', categoryId: 'cat-transporte' }, categories, now)).toBeNull();
    expect(quickSaveInput({ type: 'expense', amount: 1, categoryId: 'cat-transporte' }, categories, now)).toBeNull();
    expect(quickSaveInput({ type: 'transfer', amount: 1, accountId: 'nq', toAccountId: 'ef' }, categories, now)).toBeNull();
  });

  it('un ingreso no necesita categoría', () => {
    expect(quickSaveInput({ type: 'income', amount: 50000, accountId: 'bc' }, categories, now)?.notes).toBe('Ingreso');
  });
});
