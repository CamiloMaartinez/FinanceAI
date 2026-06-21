import { getDb } from './db';

export async function seedIfEmpty(): Promise<void> {
  const database = await getDb();

  // Verificar si ya hay datos — si los hay, no insertamos nada
  const existing = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM accounts`
  );
  if ((existing?.count ?? 0) > 0) return;

  const now = new Date().toISOString();

  // ─── Cuentas ─────────────────────────────────────────────
  await database.runAsync(
    `INSERT INTO accounts (id, name, type, balance, colorHex, iconName, isActive, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    ['acc-nequi', 'Nequi', 'digital', 450000, '#E91E8C', 'phone-portrait', now]
  );

  await database.runAsync(
    `INSERT INTO accounts (id, name, type, balance, colorHex, iconName, isActive, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    ['acc-bancolombia', 'Bancolombia', 'checking', 2800000, '#FDB913', 'business', now]
  );

  await database.runAsync(
    `INSERT INTO accounts (id, name, type, balance, colorHex, iconName, isActive, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    ['acc-efectivo', 'Efectivo', 'cash', 150000, '#34C759', 'cash', now]
  );

  // ─── Categorías ──────────────────────────────────────────
  const categories = [
    ['cat-alimentacion',    'Alimentación',    'restaurant',          '#FF9500'],
    ['cat-transporte',      'Transporte',      'car',                 '#007AFF'],
    ['cat-entretenimiento', 'Entretenimiento', 'tv',                  '#FF375F'],
    ['cat-salud',           'Salud',           'medkit',              '#FF2D55'],
    ['cat-educacion',       'Educación',       'book',                '#5856D6'],
    ['cat-tecnologia',      'Tecnología',      'laptop',              '#636366'],
    ['cat-hogar',           'Hogar',           'home',                '#34C759'],
    ['cat-viajes',          'Viajes',          'airplane',            '#32ADE6'],
    ['cat-inversiones',     'Inversiones',     'trending-up',         '#30B0C7'],
    ['cat-suscripciones',   'Suscripciones',   'repeat',              '#BF5AF2'],
    ['cat-mascotas',        'Mascotas',        'paw',                 '#AC8E68'],
    ['cat-otros',           'Otros',           'ellipsis-horizontal', '#8E8E93'],
  ];

  for (const [id, name, icon, color] of categories) {
    await database.runAsync(
      `INSERT INTO categories (id, name, iconName, colorHex, isDefault, subcategories)
       VALUES (?, ?, ?, ?, 1, '[]')`,
      [id, name, icon, color]
    );
  }

  // ─── Transacciones del mes actual ────────────────────────
  const today = new Date();

  const transactions = [
    // Ingresos
    { amount: 3500000, type: 'income',  notes: 'Salario',          categoryId: null,                  daysAgo: 1  },
    { amount: 500000,  type: 'income',  notes: 'Freelance diseño',  categoryId: null,                  daysAgo: 8  },
    // Gastos
    { amount: 45000,   type: 'expense', notes: 'Almuerzo',          categoryId: 'cat-alimentacion',    daysAgo: 2  },
    { amount: 120000,  type: 'expense', notes: 'Uber',              categoryId: 'cat-transporte',      daysAgo: 3  },
    { amount: 35900,   type: 'expense', notes: 'Netflix',           categoryId: 'cat-entretenimiento', daysAgo: 4  },
    { amount: 80000,   type: 'expense', notes: 'Supermercado',      categoryId: 'cat-alimentacion',    daysAgo: 5  },
    { amount: 25000,   type: 'expense', notes: 'Recarga transporte',categoryId: 'cat-transporte',      daysAgo: 6  },
    { amount: 15900,   type: 'expense', notes: 'Spotify',           categoryId: 'cat-entretenimiento', daysAgo: 9  },
    { amount: 200000,  type: 'expense', notes: 'Mercado semanal',   categoryId: 'cat-alimentacion',    daysAgo: 10 },
    { amount: 55000,   type: 'expense', notes: 'Farmacia',          categoryId: 'cat-salud',           daysAgo: 12 },
  ];

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const date = new Date(today);
    date.setDate(date.getDate() - tx.daysAgo);

    await database.runAsync(
      `INSERT INTO transactions
         (id, amount, type, date, accountId, categoryId, notes, tags, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?)`,
      [
        `tx-${i}`,
        tx.amount,
        tx.type,
        date.toISOString(),
        'acc-nequi',
        tx.categoryId,
        tx.notes,
        now,
      ]
    );
  }
}