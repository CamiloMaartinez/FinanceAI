import { describe, expect, it } from '@jest/globals';
import {
  parseBankMessage,
  matchAccount,
  buildPrefillFromMessage,
  describeBankMessage,
} from '../src/utils/bankMessage';

const NOW = new Date(2026, 9, 21, 18, 0); // 21 oct 2026

const accounts = [
  { id: 'bc', name: 'Bancolombia Ahorros *1234', type: 'savings' as const, isActive: true },
  { id: 'bcc', name: 'Bancolombia Mastercard 9876', type: 'credit' as const, isActive: true },
  { id: 'nq', name: 'Nequi', type: 'digital' as const, isActive: true },
  { id: 'dv', name: 'Davivienda 5678', type: 'savings' as const, isActive: true },
  { id: 'old', name: 'Bancolombia vieja 4321', type: 'savings' as const, isActive: false },
];

describe('lee los mensajes de cada banco', () => {
  it('Bancolombia: compra con tarjeta débito', () => {
    const msg = parseBankMessage(
      'Bancolombia: Compraste $45.900,00 en EXITO CALLE 80 con tu T.Deb *1234, el 12/10/2026 a las 15:32. Si tienes dudas llama al 6045109095.',
      NOW
    );
    expect(msg).toMatchObject({
      amount: 45_900,
      currency: 'COP',
      type: 'expense',
      kind: 'purchase',
      counterparty: 'Exito Calle 80',
      bank: 'Bancolombia',
      accountDigits: '1234',
      isCreditCard: false,
    });
    expect(new Date(msg!.date!)).toEqual(new Date(2026, 9, 12, 15, 32));
  });

  it('Bancolombia (formato antiguo): "le informa Compra por"', () => {
    const msg = parseBankMessage(
      'Bancolombia le informa Compra por $120.500,00 en RAPPI COLOMBIA 20:15. 18/10/2026 T.Cred *9876. Inquietudes al 6045109095/018000931987.',
      NOW
    );
    expect(msg).toMatchObject({
      amount: 120_500, type: 'expense', kind: 'purchase', counterparty: 'Rappi Colombia',
      accountDigits: '9876', isCreditCard: true,
    });
    expect(new Date(msg!.date!)).toEqual(new Date(2026, 9, 18, 20, 15));
  });

  it('Bancolombia: transferencia a otra cuenta', () => {
    const msg = parseBankMessage(
      'Bancolombia: Transferiste $150.000 desde tu cuenta *1234 a la cuenta *5678 el 20/10/2026 a las 10:15.',
      NOW
    );
    expect(msg).toMatchObject({
      amount: 150_000, type: 'expense', kind: 'transfer', accountDigits: '1234', targetDigits: '5678',
    });
  });

  it('Bancolombia: transferencia recibida', () => {
    const msg = parseBankMessage(
      'Bancolombia: Recibiste una transferencia por $1.200.000 de JUAN PEREZ en tu cuenta **1234, el 15/10/2026 a las 08:00.',
      NOW
    );
    expect(msg).toMatchObject({
      amount: 1_200_000, type: 'income', kind: 'deposit', counterparty: 'Juan Perez', accountDigits: '1234',
    });
  });

  it('Nequi: envío a una persona', () => {
    const msg = parseBankMessage('Nequi: Enviaste $50.000 a MARIA GOMEZ. Tienes dudas? Escríbenos.', NOW);
    expect(msg).toMatchObject({
      amount: 50_000, type: 'expense', kind: 'transfer', counterparty: 'Maria Gomez', bank: 'Nequi',
    });
  });

  it('Nequi: dinero recibido', () => {
    const msg = parseBankMessage('Nequi: ¡Recibiste $20.000 de Carlos Ruiz! Ya están en tu Nequi.', NOW);
    expect(msg).toMatchObject({ amount: 20_000, type: 'income', counterparty: 'Carlos Ruiz', bank: 'Nequi' });
  });

  it('Davivienda: el comercio va antes del monto', () => {
    const msg = parseBankMessage(
      'Davivienda le informa que se realizo una compra en D1 SAS por $32.450 con su tarjeta terminada en 5678 el 2026-10-19.',
      NOW
    );
    expect(msg).toMatchObject({
      amount: 32_450, type: 'expense', kind: 'purchase', counterparty: 'D1 Sas', bank: 'Davivienda', accountDigits: '5678',
    });
  });

  it('pago de un servicio', () => {
    const msg = parseBankMessage('Bancolombia: Pagaste $89.900 a CLARO COLOMBIA desde tu cuenta *1234.', NOW);
    expect(msg).toMatchObject({ amount: 89_900, kind: 'payment', counterparty: 'Claro Colombia' });
  });

  it('retiro en cajero', () => {
    const msg = parseBankMessage('Bancolombia: Retiraste $200.000 en CAJERO CENTRO CRA 7 de tu cuenta *1234.', NOW);
    expect(msg).toMatchObject({ amount: 200_000, kind: 'withdrawal', type: 'expense' });
  });

  it('compra en dólares', () => {
    const msg = parseBankMessage('Nu: Compraste USD 12,99 en NETFLIX.COM con tu tarjeta de crédito.', NOW);
    expect(msg).toMatchObject({ amount: 12.99, currency: 'USD', counterparty: 'Netflix.com', isCreditCard: true, bank: 'Nu' });
  });

  it('"pago recibido" es un ingreso, no un gasto', () => {
    const msg = parseBankMessage('DaviPlata: Pago recibido por $75.000 de TIENDA LA 14.', NOW);
    expect(msg).toMatchObject({ type: 'income', amount: 75_000, bank: 'DaviPlata' });
  });
});

describe('ignora lo que no es un movimiento', () => {
  it.each([
    ['código de seguridad', 'Bancolombia: Tu clave dinamica es 482913. No la compartas.'],
    ['compra rechazada', 'Bancolombia: Compra rechazada por $45.000 en AMAZON. Fondos insuficientes.'],
    ['sin monto', 'Nequi: Actualiza tu app para seguir disfrutando.'],
    ['solo saldo', 'Tu saldo disponible es $350.000'],
    ['vacío', ''],
  ])('%s', (_name, text) => {
    expect(parseBankMessage(text, NOW)).toBeNull();
  });

  it('una fecha en el futuro no se usa', () => {
    const msg = parseBankMessage('Bancolombia: Compraste $10.000 en TIENDA el 25/12/2026.', NOW);
    expect(msg?.date).toBeNull();
  });
});

describe('cuenta y categoría', () => {
  it('reconoce la cuenta por los últimos dígitos', () => {
    expect(matchAccount('1234', 'Bancolombia', false, accounts)).toBe('bc');
    expect(matchAccount('9876', 'Bancolombia', true, accounts)).toBe('bcc');
  });

  it('si no hay dígitos, usa el nombre del banco', () => {
    expect(matchAccount(null, 'Nequi', false, accounts)).toBe('nq');
  });

  it('no elige cuentas archivadas ni adivina sin datos', () => {
    expect(matchAccount('4321', null, false, accounts)).toBeNull();
    expect(matchAccount(null, 'BBVA', false, accounts)).toBeNull();
  });

  it('una transferencia a una cuenta propia queda como transferencia', () => {
    const msg = parseBankMessage('Bancolombia: Transferiste $150.000 desde tu cuenta *1234 a la cuenta *5678.', NOW)!;
    expect(buildPrefillFromMessage(msg, accounts, [])).toMatchObject({
      type: 'transfer', accountId: 'bc', toAccountId: 'dv', amount: 150_000,
    });
  });

  it('una transferencia a otra persona queda como gasto', () => {
    const msg = parseBankMessage('Nequi: Enviaste $50.000 a MARIA GOMEZ.', NOW)!;
    expect(buildPrefillFromMessage(msg, accounts, [])).toMatchObject({
      type: 'expense', accountId: 'nq', notes: 'Transferencia a Maria Gomez',
    });
  });

  it('reutiliza la categoría de la última compra en ese comercio', () => {
    const history = [
      { notes: 'Exito Calle 93', categoryId: 'mercado', type: 'expense' as const },
      { notes: 'Rappi', categoryId: 'domicilios', type: 'expense' as const },
    ];
    const msg = parseBankMessage('Bancolombia: Compraste $45.900 en EXITO CALLE 80 con tu T.Deb *1234.', NOW)!;
    expect(buildPrefillFromMessage(msg, accounts, history)).toMatchObject({
      type: 'expense', accountId: 'bc', categoryId: 'mercado', notes: 'Exito Calle 80',
    });
  });

  it('describe el movimiento cuando no hay comercio', () => {
    const msg = parseBankMessage('Bancolombia: Transferiste $150.000 desde tu cuenta *1234 a la cuenta *5678.', NOW)!;
    expect(describeBankMessage(msg)).toBe('Transferencia');
  });
});
