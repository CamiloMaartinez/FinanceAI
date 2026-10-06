import { getDb, DEFAULT_CATEGORY_STYLE } from './db';

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
  const names: Record<string, string> = {
    'cat-alimentacion':    'Alimentación',
    'cat-transporte':      'Transporte',
    'cat-entretenimiento': 'Entretenimiento',
    'cat-salud':           'Salud',
    'cat-educacion':       'Educación',
    'cat-tecnologia':      'Tecnología',
    'cat-hogar':           'Hogar',
    'cat-viajes':          'Viajes',
    'cat-inversiones':     'Inversiones',
    'cat-suscripciones':   'Suscripciones',
    'cat-mascotas':        'Mascotas',
    'cat-otros':           'Otros',
  };

  // Ícono del set propio y fondo pastel (mismos ids de siempre)
  for (const { id, iconName, colorHex } of DEFAULT_CATEGORY_STYLE) {
    await database.runAsync(
      `INSERT INTO categories (id, name, iconName, colorHex, isDefault, subcategories)
       VALUES (?, ?, ?, ?, 1, '[]')`,
      [id, names[id], iconName, colorHex]
    );
  }

  // Nota: ya NO se insertan cuentas ni transacciones de ejemplo. Cada
  // base de datos nueva (cada perfil nuevo) arranca en 0 — el usuario
  // crea sus propias cuentas y registra sus propios movimientos desde
  // cero, como corresponde a una cuenta real.
}