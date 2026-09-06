import { getDb } from './db';

export async function seedIfEmpty(): Promise<void> {
  const database = await getDb();

  // Verificar si ya hay datos — si las categorías ya existen, no insertamos
  // nada más. Usamos "categories" (no "accounts") como ancla porque ya no
  // sembramos cuentas de ejemplo, y las categorías nunca se borran desde
  // la app, así que son un indicador confiable de "esto ya se inicializó".
  const existing = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM categories`
  );
  if ((existing?.count ?? 0) > 0) return;

  // ─── Categorías por defecto ──────────────────────────────
  // Esto SÍ se crea siempre en una base de datos nueva (incluyendo cada
  // perfil nuevo) — son solo definiciones necesarias para que la app
  // funcione, no "datos financieros" del usuario.
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

  // Nota: ya NO se insertan cuentas ni transacciones de ejemplo. Cada
  // base de datos nueva (cada perfil nuevo) arranca en 0 — el usuario
  // crea sus propias cuentas y registra sus propios movimientos desde
  // cero, como corresponde a una cuenta real.
}