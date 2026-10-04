import { describe, expect, it, jest } from '@jest/globals';
import {
  parseCsv, parseBankStatement, parseBankDate, parseSignedAmount, detectDateOrder,
  findDuplicates, suggestCategoryFromHistory, decodeWindows1252, looksMisdecoded,
} from '../src/utils/csvImport';

const ymd = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

describe('lectura de CSV', () => {
  it('respeta comillas, separadores dentro de comillas y comillas dobles', () => {
    expect(parseCsv('a;"b; c";"dijo ""hola"""\r\n1;2;3', ';')).toEqual([
      ['a', 'b; c', 'dijo "hola"'],
      ['1', '2', '3'],
    ]);
  });
});

describe('montos', () => {
  it.each([
    ['-1.234,56', -1234.56],
    ['1.234,56', 1234.56],
    ['$ 1,234.56', 1234.56],
    ['(50.000)', -50000],
    ['1.500-', -1500],
    ['COP 25000', 25000],
    ['-$ 89.900', -89900],
  ])('%s → %d', (raw, expected) => {
    expect(parseSignedAmount(raw)).toBe(expected);
  });

  it('vacío o sin números no es un monto', () => {
    expect(parseSignedAmount('')).toBeNull();
    expect(parseSignedAmount('N/A')).toBeNull();
  });
});

describe('fechas', () => {
  it('lee los formatos comunes', () => {
    expect(ymd(parseBankDate('2026-10-31')!.toISOString())).toBe('2026-10-31');
    expect(ymd(parseBankDate('31/10/2026')!.toISOString())).toBe('2026-10-31');
    expect(ymd(parseBankDate('05-10-26')!.toISOString())).toBe('2026-10-05');
    expect(ymd(parseBankDate('10/31/2026', 'mdy')!.toISOString())).toBe('2026-10-31');
  });

  it('rechaza fechas imposibles', () => {
    expect(parseBankDate('31/02/2026')).toBeNull();
    expect(parseBankDate('hola')).toBeNull();
  });

  it('detecta si el extracto usa día/mes o mes/día', () => {
    expect(detectDateOrder(['03/04/2026', '25/04/2026'])).toBe('dmy');
    expect(detectDateOrder(['04/03/2026', '04/25/2026'])).toBe('mdy');
    expect(detectDateOrder(['03/04/2026'])).toBe('dmy'); // ambiguo: formato colombiano
  });
});

describe('extractos completos', () => {
  it('monto con signo, separador ";" y líneas de información antes de los encabezados', () => {
    const csv = [
      'Banco Ejemplo S.A.',
      'Cuenta de ahorros;****1234',
      'Período;Octubre 2026',
      '',
      'Fecha;Descripción;Referencia;Valor;Saldo',
      '01/10/2026;PAGO NOMINA EMPRESA;001;3.500.000,00;4.000.000,00',
      '03/10/2026;COMPRA EXITO;002;-185.400,00;3.814.600,00',
      '05/10/2026;"NETFLIX.COM; BOGOTA";003;-44.900,00;3.769.700,00',
      'Total;;;;3.769.700,00',
    ].join('\n');

    const result = parseBankStatement(csv);

    expect(result.rows.map((r) => [ymd(r.date), r.type, r.amount, r.description])).toEqual([
      ['2026-10-01', 'income', 3_500_000, 'PAGO NOMINA EMPRESA'],
      ['2026-10-03', 'expense', 185_400, 'COMPRA EXITO'],
      ['2026-10-05', 'expense', 44_900, 'NETFLIX.COM; BOGOTA'],
    ]);
    expect(result.skipped).toBe(1); // la fila de "Total"
  });

  it('columnas separadas de débito y crédito, separador ","', () => {
    const csv = [
      'Fecha,Concepto,Débito,Crédito',
      '2026-10-02,Transferencia recibida,,250000',
      '2026-10-04,Retiro cajero,100000,',
    ].join('\n');

    expect(parseBankStatement(csv).rows.map((r) => [r.type, r.amount])).toEqual([
      ['income', 250_000],
      ['expense', 100_000],
    ]);
  });

  it('columna de valor positivo con una columna "Tipo" D/C', () => {
    const csv = 'Fecha;Detalle;Valor;Tipo\n10/10/2026;Arriendo;1.200.000;D\n11/10/2026;Reembolso;80.000;C';
    expect(parseBankStatement(csv).rows.map((r) => [r.type, r.amount])).toEqual([
      ['expense', 1_200_000],
      ['income', 80_000],
    ]);
  });

  it('si no reconoce las columnas lo dice, y se pueden elegir a mano', () => {
    const csv = 'Día;Qué;Cuánto\n01/10/2026;Café;-8000';
    const auto = parseBankStatement(csv);
    expect(auto.mapping).toBeNull();
    expect(auto.headers).toEqual(['Día', 'Qué', 'Cuánto']);

    const manual = parseBankStatement(csv, { date: 0, description: 1, amount: 2, debit: null, credit: null, kind: null });
    expect(manual.rows).toHaveLength(1);
    expect(manual.rows[0]).toMatchObject({ type: 'expense', amount: 8000, description: 'Café' });
  });
});

describe('duplicados', () => {
  const rows = parseBankStatement('Fecha;Descripción;Valor\n03/10/2026;EXITO;-185.400\n03/10/2026;EXITO;-185.400\n04/10/2026;D1;-20.000').rows;

  it('marca los que ya existen en esa cuenta (mismo día, monto y tipo), uno por uno', () => {
    const existing = [{ date: new Date(2026, 9, 3, 18).toISOString(), amount: 185_400, type: 'expense' as const, accountId: 'acc-1' }];
    // Solo UNO de los dos "EXITO" coincide con el ya registrado
    expect([...findDuplicates(rows, existing, 'acc-1')]).toEqual([0]);
  });

  it('no compara con movimientos de otra cuenta', () => {
    const existing = [{ date: new Date(2026, 9, 3, 18).toISOString(), amount: 185_400, type: 'expense' as const, accountId: 'acc-2' }];
    expect(findDuplicates(rows, existing, 'acc-1').size).toBe(0);
  });
});

describe('categoría según el historial', () => {
  const history = [
    { notes: 'NETFLIX.COM 4521', categoryId: 'cat-subs', type: 'expense' as const },
    { notes: 'Éxito Calle 80', categoryId: 'cat-food', type: 'expense' as const },
  ];

  it('reutiliza la categoría de un gasto con la misma descripción, sin importar números ni tildes', () => {
    expect(suggestCategoryFromHistory('Netflix.com 9988', history)).toBe('cat-subs');
    expect(suggestCategoryFromHistory('EXITO CALLE 80', history)).toBe('cat-food');
  });

  it('no inventa categoría si no hay coincidencia', () => {
    expect(suggestCategoryFromHistory('Farmacia', history)).toBeNull();
  });
});

describe('importar a la base de datos', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const load = () => { jest.resetModules(); return require('../src/database/db') as typeof import('../src/database/db'); };

  it('importa todo junto y ajusta el saldo de la cuenta', async () => {
    const db = load();
    await db.createAccount('Ahorros', 'savings', 1_000_000, '#00f', 'wallet');
    const [acc] = await db.getAllAccounts();
    const { rows } = parseBankStatement('Fecha;Descripción;Valor\n01/10/2026;Nómina;3.500.000\n03/10/2026;Mercado;-185.400');

    const count = await db.importTransactions(rows.map((r) => ({
      amount: r.amount, type: r.type, date: r.date, accountId: acc.id,
      toAccountId: null, categoryId: null, notes: r.description,
    })));

    expect(count).toBe(2);
    expect((await db.getAllAccounts())[0].balance).toBe(1_000_000 + 3_500_000 - 185_400);
  });

  it('si un movimiento falla, no importa ninguno', async () => {
    const db = load();
    await db.createAccount('Ahorros', 'savings', 1_000_000, '#00f', 'wallet');
    const [acc] = await db.getAllAccounts();
    const ok = { amount: 1000, type: 'expense' as const, date: new Date().toISOString(), accountId: acc.id, toAccountId: null, categoryId: null, notes: '' };

    // Una transferencia sin destino lanza error a mitad de la importación
    await expect(db.importTransactions([ok, { ...ok, type: 'transfer' }])).rejects.toThrow();
    expect(await db.getAllTransactionsWithCategory()).toHaveLength(0);
    expect((await db.getAllAccounts())[0].balance).toBe(1_000_000);
  });
});

describe('codificación del archivo', () => {
  it('decodifica Windows-1252 (tildes, ñ y €) cuando el banco no exporta en UTF-8', () => {
    // "Débito;Año;€" en Windows-1252
    const bytes = new Uint8Array([0x44, 0xe9, 0x62, 0x69, 0x74, 0x6f, 0x3b, 0x41, 0xf1, 0x6f, 0x3b, 0x80]);
    expect(decodeWindows1252(bytes)).toBe('Débito;Año;€');
  });

  it('detecta texto mal decodificado', () => {
    expect(looksMisdecoded('D\uFFFDbito')).toBe(true);
    expect(looksMisdecoded('Débito')).toBe(false);
  });
});
