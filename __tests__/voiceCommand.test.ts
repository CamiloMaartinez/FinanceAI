import { describe, expect, it } from '@jest/globals';
import { isDirectCommand, isQuestion, parseVoiceCommand, transactionParams, type VoiceContext } from '../src/utils/voiceCommand';

const context: VoiceContext = {
  accounts: [
    { id: 'acc-nequi', name: 'Nequi' },
    { id: 'acc-banco', name: 'Bancolombia Ahorros' },
    { id: 'acc-efectivo', name: 'Efectivo' },
  ],
  categories: [
    { id: 'cat-alimentacion', name: 'Alimentación', subcategories: ['Restaurantes'] },
    { id: 'cat-transporte', name: 'Transporte' },
    { id: 'cat-otros', name: 'Otros' },
  ],
};

const amountOf = (text: string) => {
  const cmd = parseVoiceCommand(text, context);
  return cmd.kind === 'transaction' ? cmd.amount : undefined;
};

describe('montos dictados', () => {
  it.each([
    ['gasté 25 mil', 25_000],
    ['gasté 25.000 pesos', 25_000],
    ['gasté $25.000', 25_000],
    ['gasté 25mil', 25_000],
    ['gasté 50k', 50_000],
    ['gasté veinticinco mil', 25_000],
    ['gasté treinta y cinco mil', 35_000],
    ['recibí 2 millones', 2_000_000],
    ['recibí 1,5 millones', 1_500_000],
    ['recibí un millón doscientos mil', 1_200_000],
    ['recibí un millón y medio', 1_500_000],
    ['recibí medio millón', 500_000],
    ['recibí dos millones quinientos mil', 2_500_000],
    ['gasté 20 lucas', 20_000],
    ['gasté mil quinientos', 1_500],
  ])('"%s" → %d', (text, expected) => {
    expect(amountOf(text)).toBe(expected);
  });

  it('toma el monto más grande si hay varios números', () => {
    expect(amountOf('gasté 18 mil en 2 cafés')).toBe(18_000);
  });
});

describe('movimientos', () => {
  it('gasto con comercio, cuenta y categoría por pista', () => {
    expect(parseVoiceCommand('Gasté 25 mil en almuerzo con Nequi', context)).toEqual({
      kind: 'transaction',
      type: 'expense',
      amount: 25_000,
      notes: 'Almuerzo',
      accountId: 'acc-nequi',
      categoryId: 'cat-alimentacion',
    });
  });

  it('reconoce la categoría por su nombre o subcategoría', () => {
    const a = parseVoiceCommand('pagué 12 mil de transporte', context);
    const b = parseVoiceCommand('compré 80 mil en restaurantes', context);
    expect(a.kind === 'transaction' && a.categoryId).toBe('cat-transporte');
    expect(b.kind === 'transaction' && b.categoryId).toBe('cat-alimentacion');
  });

  it('ingreso con nota', () => {
    expect(parseVoiceCommand('me pagaron 2 millones de salario en Bancolombia', context)).toEqual({
      kind: 'transaction',
      type: 'income',
      amount: 2_000_000,
      notes: 'Salario',
      accountId: 'acc-banco',
    });
  });

  it('transferencia entre cuentas: "de X a Y"', () => {
    expect(parseVoiceCommand('Transfiere 100 mil de Bancolombia a Nequi', context)).toEqual({
      kind: 'transaction',
      type: 'transfer',
      amount: 100_000,
      notes: '',
      accountId: 'acc-banco',
      toAccountId: 'acc-nequi',
    });
  });

  it('transferencia con solo destino', () => {
    const cmd = parseVoiceCommand('pasa 50 mil a efectivo', context);
    expect(cmd).toMatchObject({ type: 'transfer', toAccountId: 'acc-efectivo' });
    expect(cmd.kind === 'transaction' && cmd.accountId).toBeFalsy();
  });

  it('solo el monto se toma como gasto', () => {
    expect(parseVoiceCommand('15 mil Starbucks', context)).toMatchObject({
      kind: 'transaction', type: 'expense', amount: 15_000, notes: 'Starbucks',
    });
  });

  it('verbo sin monto abre el formulario para escribirlo', () => {
    expect(parseVoiceCommand('registra un gasto', context)).toMatchObject({
      kind: 'transaction', type: 'expense', amount: null,
    });
  });

  it('quita el relleno de Siri', () => {
    const cmd = parseVoiceCommand('Oye Siri, anota un gasto de 8 mil en café por favor', context);
    expect(cmd).toMatchObject({ type: 'expense', amount: 8_000, notes: 'Café' });
  });
});

describe('navegación', () => {
  it.each([
    ['abre presupuestos', '/budgets'],
    ['Muéstrame los reportes', '/reports'],
    ['ir a metas', '/goals'],
    ['suscripciones', '/subscriptions'],
    ['abre el inicio', '/'],
    ['ver deudas', '/debts'],
  ])('"%s" → %s', (text, route) => {
    expect(parseVoiceCommand(text, context)).toMatchObject({ kind: 'navigate', route });
  });
});

describe('preguntas y frases sin acción', () => {
  it.each([
    '¿Cuánto gasté en comida este mes?',
    'cuanto gaste en comida',
    'qué tal mi presupuesto',
    'hola',
    '',
  ])('"%s" no es un comando', (text) => {
    expect(parseVoiceCommand(text, context)).toEqual({ kind: 'unknown' });
  });

  it('detecta preguntas', () => {
    expect(isQuestion('¿Puedo comprar un celular?')).toBe(true);
    expect(isQuestion('gasté 20 mil')).toBe(false);
  });
});

describe('parámetros para Movimientos', () => {
  it('usa el mismo formato de los atajos', () => {
    const cmd = parseVoiceCommand('transfiere 100 mil de Bancolombia a Nequi', context);
    if (cmd.kind !== 'transaction') throw new Error('se esperaba un movimiento');
    expect(transactionParams(cmd)).toEqual({
      tipo: 'transferencia', monto: '100000', cuenta: 'acc-banco', destino: 'acc-nequi',
    });
  });
});

describe('órdenes dentro del chat del asistente', () => {
  it.each([
    ['gasté 20 mil en almuerzo', true],
    ['me pagaron 2 millones', true],
    ['abre presupuestos', true],
    ['25 mil Starbucks', true],
    ['Ayúdame, gasté 2 millones este mes', false],
    ['registra un gasto', false],
    ['¿Cuánto gasté en comida?', false],
  ])('"%s" → %s', (text, expected) => {
    expect(isDirectCommand(text)).toBe(expected);
  });
});
