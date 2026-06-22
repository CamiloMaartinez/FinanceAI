import * as SQLite from 'expo-sqlite';

// Variable que guarda la conexión abierta a la base de datos
let db: SQLite.SQLiteDatabase | null = null;

// ─── Obtener o crear la conexión ───────────────────────────
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db; // Si ya está abierta, la reutilizamos
  db = await SQLite.openDatabaseAsync('financeai.db');
  await initDb(db);
  return db;
}

// ─── Crear las tablas si no existen ────────────────────────
async function initDb(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS accounts (
      id        TEXT PRIMARY KEY NOT NULL,
      name      TEXT NOT NULL,
      type      TEXT NOT NULL,
      balance   REAL NOT NULL DEFAULT 0,
      colorHex  TEXT NOT NULL,
      iconName  TEXT NOT NULL,
      isActive  INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id            TEXT PRIMARY KEY NOT NULL,
      name          TEXT NOT NULL,
      iconName      TEXT NOT NULL,
      colorHex      TEXT NOT NULL,
      isDefault     INTEGER NOT NULL DEFAULT 0,
      subcategories TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id         TEXT PRIMARY KEY NOT NULL,
      amount     REAL NOT NULL,
      type       TEXT NOT NULL,
      date       TEXT NOT NULL,
      accountId  TEXT NOT NULL,
      categoryId TEXT,
      notes      TEXT NOT NULL DEFAULT '',
      tags       TEXT NOT NULL DEFAULT '[]',
      createdAt  TEXT NOT NULL,
      FOREIGN KEY (accountId)  REFERENCES accounts(id),
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS goals (
      id            TEXT PRIMARY KEY NOT NULL,
      name          TEXT NOT NULL,
      targetAmount  REAL NOT NULL,
      currentAmount REAL NOT NULL DEFAULT 0,
      targetDate    TEXT NOT NULL,
      priority      TEXT NOT NULL DEFAULT 'medium',
      iconName      TEXT NOT NULL,
      colorHex      TEXT NOT NULL,
      isCompleted   INTEGER NOT NULL DEFAULT 0,
      createdAt     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id              TEXT PRIMARY KEY NOT NULL,
      name            TEXT NOT NULL,
      amount          REAL NOT NULL,
      frequency       TEXT NOT NULL,
      nextBillingDate TEXT NOT NULL,
      iconName        TEXT NOT NULL,
      colorHex        TEXT NOT NULL,
      isActive        INTEGER NOT NULL DEFAULT 1,
      createdAt       TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date
      ON transactions(date);
      CREATE TABLE IF NOT EXISTS cards (
      id              TEXT PRIMARY KEY NOT NULL,
      name            TEXT NOT NULL,
      bank            TEXT NOT NULL,
      annualFee       REAL NOT NULL DEFAULT 0,
      cashbackPercent REAL NOT NULL DEFAULT 0,
      interestRate    REAL NOT NULL DEFAULT 0,
      benefits        TEXT NOT NULL DEFAULT '[]',
      colorHex        TEXT NOT NULL,
      isFavorite      INTEGER NOT NULL DEFAULT 0,
      createdAt       TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_account
      ON transactions(accountId);
    CREATE INDEX IF NOT EXISTS idx_transactions_category
      ON transactions(categoryId);
  `);
}

// ─── Queries del Dashboard ──────────────────────────────────

export async function getTotalBalance(): Promise<number> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(balance) as total FROM accounts WHERE isActive = 1`
  );
  return row?.total ?? 0;
}

export async function getMonthlyTotals(
  month: number,
  year: number
): Promise<{ income: number; expense: number }> {
  const database = await getDb();

  // Rango de fechas del mes
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 1).toISOString();

  const incomeRow = await database.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total
     FROM transactions
     WHERE type = 'income' AND date >= ? AND date < ?`,
    [start, end]
  );

  const expenseRow = await database.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total
     FROM transactions
     WHERE type IN ('expense','payment') AND date >= ? AND date < ?`,
    [start, end]
  );

  return {
    income: incomeRow?.total ?? 0,
    expense: expenseRow?.total ?? 0,
  };
}

export async function getRecentTransactions(
  limit: number = 5
): Promise<any[]> {
  const database = await getDb();

  const rows = await database.getAllAsync<any>(
    `SELECT
       t.*,
       c.name     as categoryName,
       c.iconName as categoryIcon,
       c.colorHex as categoryColor
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.categoryId
     ORDER BY t.date DESC
     LIMIT ?`,
    [limit]
  );

  return rows.map((r) => ({
    ...r,
    tags: JSON.parse(r.tags || '[]'),
  }));
}
// ─── Queries de Cuentas ────────────────────────────────────

export async function getAllAccounts(): Promise<any[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM accounts WHERE isActive = 1 ORDER BY createdAt ASC`
  );
  return rows;
}

export async function createAccount(
  name: string,
  type: string,
  balance: number,
  colorHex: string,
  iconName: string
): Promise<void> {
  const database = await getDb();
  const id = `acc-${Date.now()}`;
  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO accounts (id, name, type, balance, colorHex, iconName, isActive, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    [id, name, type, balance, colorHex, iconName, now]
  );
}

export async function updateAccount(
  id: string,
  name: string,
  type: string,
  colorHex: string,
  iconName: string
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `UPDATE accounts SET name = ?, type = ?, colorHex = ?, iconName = ?
     WHERE id = ?`,
    [name, type, colorHex, iconName, id]
  );
}

export async function deleteAccount(id: string): Promise<void> {
  const database = await getDb();
  // Soft delete: marcamos como inactivo en lugar de borrar
  await database.runAsync(
    `UPDATE accounts SET isActive = 0 WHERE id = ?`,
    [id]
  );
}
// ─── Queries de Transacciones ──────────────────────────────

export async function getAllTransactionsWithCategory(): Promise<any[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<any>(
    `SELECT
       t.*,
       c.name     as categoryName,
       c.iconName as categoryIcon,
       c.colorHex as categoryColor,
       a.name     as accountName,
       a.colorHex as accountColor
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.categoryId
     LEFT JOIN accounts a ON a.id = t.accountId
     ORDER BY t.date DESC`
  );
  return rows.map((r) => ({ ...r, tags: JSON.parse(r.tags || '[]') }));
}

export async function getAllCategories(): Promise<any[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM categories ORDER BY name ASC`
  );
  return rows.map((r) => ({
    ...r,
    subcategories: JSON.parse(r.subcategories || '[]'),
  }));
}

export async function createTransaction(
  amount: number,
  type: string,
  date: string,
  accountId: string,
  categoryId: string | null,
  notes: string
): Promise<void> {
  const database = await getDb();
  const id = `tx-${Date.now()}`;
  const now = new Date().toISOString();

  // Insertar la transacción
  await database.runAsync(
    `INSERT INTO transactions (id, amount, type, date, accountId, categoryId, notes, tags, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?)`,
    [id, amount, type, date, accountId, categoryId, notes, now]
  );

  // Actualizar el saldo de la cuenta correspondiente
  const signedAmount =
    type === 'income' || type === 'loan' ? amount : -amount;

  await database.runAsync(
    `UPDATE accounts SET balance = balance + ? WHERE id = ?`,
    [signedAmount, accountId]
  );
}

export async function deleteTransaction(
  id: string,
  amount: number,
  type: string,
  accountId: string
): Promise<void> {
  const database = await getDb();

  // Revertir el saldo antes de borrar
  const signedAmount =
    type === 'income' || type === 'loan' ? -amount : amount;

  await database.runAsync(
    `UPDATE accounts SET balance = balance + ? WHERE id = ?`,
    [signedAmount, accountId]
  );

  await database.runAsync(`DELETE FROM transactions WHERE id = ?`, [id]);
}
// ─── Queries de Metas ───────────────────────────────────────

export async function getAllGoals(): Promise<any[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM goals WHERE isCompleted = 0 ORDER BY targetDate ASC`
  );
  return rows;
}

export async function createGoal(
  name: string,
  targetAmount: number,
  targetDate: string,
  priority: string,
  colorHex: string,
  iconName: string
): Promise<void> {
  const database = await getDb();
  const id = `goal-${Date.now()}`;
  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO goals
       (id, name, targetAmount, currentAmount, targetDate, priority, iconName, colorHex, isCompleted, createdAt)
     VALUES (?, ?, ?, 0, ?, ?, ?, ?, 0, ?)`,
    [id, name, targetAmount, targetDate, priority, iconName, colorHex, now]
  );
}

export async function contributeToGoal(
  id: string,
  amount: number
): Promise<void> {
  const database = await getDb();

  await database.runAsync(
    `UPDATE goals SET currentAmount = currentAmount + ? WHERE id = ?`,
    [amount, id]
  );

  // Marcar como completada si alcanzó o superó el objetivo
  await database.runAsync(
    `UPDATE goals SET isCompleted = 1
     WHERE id = ? AND currentAmount >= targetAmount`,
    [id]
  );
}

export async function deleteGoal(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(`DELETE FROM goals WHERE id = ?`, [id]);
}
// ─── Queries de Suscripciones ──────────────────────────────

export async function getAllSubscriptions(): Promise<any[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM subscriptions WHERE isActive = 1 ORDER BY nextBillingDate ASC`
  );
  return rows;
}

export async function createSubscription(
  name: string,
  amount: number,
  frequency: string,
  nextBillingDate: string,
  colorHex: string,
  iconName: string
): Promise<string> {
  const database = await getDb();
  const id = `sub-${Date.now()}`;
  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO subscriptions
       (id, name, amount, frequency, nextBillingDate, iconName, colorHex, isActive, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [id, name, amount, frequency, nextBillingDate, iconName, colorHex, now]
  );

  return id;
}

export async function deleteSubscription(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `UPDATE subscriptions SET isActive = 0 WHERE id = ?`,
    [id]
  );
}
// ─── Queries de Reportes ────────────────────────────────────

export async function getCategoryBreakdown(
  month: number,
  year: number
): Promise<{ categoryId: string; categoryName: string; categoryColor: string; total: number }[]> {
  const database = await getDb();
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 1).toISOString();

  const rows = await database.getAllAsync<any>(
    `SELECT
       c.id as categoryId,
       c.name as categoryName,
       c.colorHex as categoryColor,
       SUM(t.amount) as total
     FROM transactions t
     INNER JOIN categories c ON c.id = t.categoryId
     WHERE t.type IN ('expense','payment')
       AND t.date >= ? AND t.date < ?
     GROUP BY c.id
     ORDER BY total DESC`,
    [start, end]
  );

  return rows;
}

export async function getTransactionsByCategory(
  categoryId: string,
  month: number,
  year: number
): Promise<any[]> {
  const database = await getDb();
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 1).toISOString();

  const rows = await database.getAllAsync<any>(
    `SELECT * FROM transactions
     WHERE categoryId = ? AND date >= ? AND date < ?
     ORDER BY date DESC`,
    [categoryId, start, end]
  );

  return rows;
}

// ─── Queries de Tarjetas ───────────────────────────────────

export async function getAllCards(): Promise<any[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM cards ORDER BY isFavorite DESC, createdAt ASC`
  );
  return rows.map((r) => ({
    ...r,
    benefits: JSON.parse(r.benefits || '[]'),
  }));
}

export async function createCard(
  name: string,
  bank: string,
  annualFee: number,
  cashbackPercent: number,
  interestRate: number,
  benefits: string[],
  colorHex: string
): Promise<void> {
  const database = await getDb();
  const id  = `card-${Date.now()}`;
  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO cards
       (id, name, bank, annualFee, cashbackPercent, interestRate, benefits, colorHex, isFavorite, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, name, bank, annualFee, cashbackPercent, interestRate, JSON.stringify(benefits), colorHex, now]
  );
}

export async function toggleFavoriteCard(id: string, isFavorite: boolean): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `UPDATE cards SET isFavorite = ? WHERE id = ?`,
    [isFavorite ? 1 : 0, id]
  );
}

export async function deleteCard(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(`DELETE FROM cards WHERE id = ?`, [id]);
}