import * as SQLite from 'expo-sqlite';
import type {
  Account,
  Category,
  Transaction,
  TransactionWithCategory,
  Goal,
  Subscription,
  Card,
  Alert,
  Budget,
  Challenge,
  TransactionInput,
  RecurringTransaction,
  Debt,
  DebtDirection,
  DebtPayment,
  GoalAutoContribution,
  NetWorthPeriod,
} from '../models/types';
import { getExchangeRates, convertToCOP } from '../services/exchangeRates';
import { dueOccurrences, atLocalNoon, type RecurrenceFrequency } from '../utils/recurrence';
import { advanceBillingDate } from '../utils/subscriptionCalculations';
import { splitAmount } from '../utils/splitExpense';

// Filas crudas de SQLite: los campos que se guardan como JSON en texto
// (tags, subcategories, benefits) llegan como string y hay que parsearlos.
type TransactionRow = Omit<TransactionWithCategory, 'tags'> & { tags: string };
type CategoryRow = Omit<Category, 'subcategories'> & { subcategories: string };
type CardRow = Omit<Card, 'benefits'> & { benefits: string };

// Variable que guarda la conexión abierta a la base de datos
let db: SQLite.SQLiteDatabase | null = null;
let activeDbFileName = 'financeai.db';

// Debe llamarse ANTES de la primera llamada a getDb() (típicamente al
// arrancar la app, tras leer el perfil activo de AsyncStorage). Si se
// llama después de que la conexión ya está abierta, no tiene efecto —
// cambiar de perfil requiere reiniciar la app.
export function setDatabaseFileName(fileName: string): void {
  activeDbFileName = fileName;
}

// ─── Obtener o crear la conexión ───────────────────────────
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db; // Si ya está abierta, la reutilizamos
  db = await SQLite.openDatabaseAsync(activeDbFileName);
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
      currency  TEXT NOT NULL DEFAULT 'COP',
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

          CREATE TABLE IF NOT EXISTS alerts (
      id          TEXT PRIMARY KEY NOT NULL,
      title       TEXT NOT NULL,
      type        TEXT NOT NULL,
      condition   TEXT NOT NULL,
      threshold   REAL NOT NULL DEFAULT 0,
      categoryId  TEXT,
      isActive    INTEGER NOT NULL DEFAULT 1,
      lastTriggered TEXT,
      createdAt   TEXT NOT NULL
    );
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
      CREATE TABLE IF NOT EXISTS budgets (
      id             TEXT PRIMARY KEY NOT NULL,
      month          INTEGER NOT NULL,
      year           INTEGER NOT NULL,
      totalLimit     REAL NOT NULL DEFAULT 0,
      categoryLimits TEXT NOT NULL DEFAULT '{}',
      isAIGenerated  INTEGER NOT NULL DEFAULT 0,
      createdAt      TEXT NOT NULL,
      UNIQUE(month, year)
    );
    CREATE TABLE IF NOT EXISTS challenges (
      id          TEXT PRIMARY KEY NOT NULL,
      title       TEXT NOT NULL,
      description TEXT NOT NULL,
      categoryId  TEXT NOT NULL,
      startDate   TEXT NOT NULL,
      endDate     TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'active',
      createdAt   TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS debts (
      id            TEXT PRIMARY KEY NOT NULL,
      direction     TEXT NOT NULL,
      personName    TEXT NOT NULL,
      amount        REAL NOT NULL,
      notes         TEXT NOT NULL DEFAULT '',
      date          TEXT NOT NULL,
      dueDate       TEXT,
      accountId     TEXT,
      transactionId TEXT,
      isSettled     INTEGER NOT NULL DEFAULT 0,
      settledAt     TEXT,
      createdAt     TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS debt_payments (
      id            TEXT PRIMARY KEY NOT NULL,
      debtId        TEXT NOT NULL,
      amount        REAL NOT NULL,
      date          TEXT NOT NULL,
      accountId     TEXT,
      transactionId TEXT,
      createdAt     TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS goal_auto_contributions (
      id        TEXT PRIMARY KEY NOT NULL,
      goalId    TEXT NOT NULL,
      amount    REAL NOT NULL,
      frequency TEXT NOT NULL,
      anchorDay INTEGER NOT NULL,
      nextDate  TEXT NOT NULL,
      isActive  INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id         TEXT PRIMARY KEY NOT NULL,
      amount     REAL NOT NULL,
      type       TEXT NOT NULL,
      accountId  TEXT NOT NULL,
      categoryId TEXT,
      notes      TEXT NOT NULL DEFAULT '',
      frequency  TEXT NOT NULL,
      anchorDay  INTEGER NOT NULL,
      nextDate   TEXT NOT NULL,
      isActive   INTEGER NOT NULL DEFAULT 1,
      createdAt  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_account
      ON transactions(accountId);
    CREATE INDEX IF NOT EXISTS idx_transactions_category
      ON transactions(categoryId);
  `);

  // ── Migraciones para bases de datos creadas antes de esta versión ──
  // CREATE TABLE IF NOT EXISTS no agrega columnas a tablas que ya existen,
  // así que las columnas nuevas se agregan aquí con ALTER TABLE. SQLite no
  // soporta "ADD COLUMN IF NOT EXISTS", por eso el try/catch: si la columna
  // ya existe (apps más nuevas, o esta migración ya corrió antes), el error
  // se ignora sin problema.
  try {
    await database.execAsync(`ALTER TABLE accounts ADD COLUMN currency TEXT NOT NULL DEFAULT 'COP';`);
  } catch {
    // La columna ya existe — no hay nada que hacer
  }
  try {
    await database.execAsync(`ALTER TABLE transactions ADD COLUMN toAccountId TEXT;`);
  } catch {
    // La columna ya existe — no hay nada que hacer
  }
  try {
    await database.execAsync(`ALTER TABLE subscriptions ADD COLUMN anchorDay INTEGER;`);
  } catch {
    // La columna ya existe — no hay nada que hacer
  }
  try {
    // Ruta RELATIVA de la foto del recibo (ver services/receiptStorage.ts)
    await database.execAsync(`ALTER TABLE transactions ADD COLUMN receiptUri TEXT;`);
  } catch {
    // La columna ya existe — no hay nada que hacer
  }
  try {
    // Transferencias entre monedas: monto que llega a la cuenta destino, en
    // SU moneda (null = el mismo monto, misma moneda)
    await database.execAsync(`ALTER TABLE transactions ADD COLUMN toAmount REAL;`);
  } catch {
    // La columna ya existe — no hay nada que hacer
  }
}

// ─── Queries del Dashboard ──────────────────────────────────

export async function getTotalBalance(): Promise<number> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ balance: number; currency: string }>(
    `SELECT balance, currency FROM accounts WHERE isActive = 1`
  );

  const rates = await getExchangeRates();
  return rows.reduce((sum, acc) => sum + convertToCOP(acc.balance, acc.currency, rates), 0);
}

const MONTH_ABBR = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

// Reconstruye el patrimonio total al inicio de cada uno de los últimos
// `monthsBack` meses, retrocediendo desde el saldo actual usando los
// ingresos/gastos reales de cada mes. Como el saldo de las cuentas SOLO
// cambia a través de transacciones registradas en la app, esta reconstrucción
// es exacta, no una aproximación.
export async function getNetWorthHistory(
  monthsBack: number = 6
): Promise<{ label: string; value: number }[]> {
  const now = new Date();
  const currentTotal = await getTotalBalance();

  const points: { label: string; value: number }[] = [{ label: 'Hoy', value: currentTotal }];
  let runningTotal = currentTotal;

  for (let i = 0; i < monthsBack; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    runningTotal = runningTotal - (await getMonthlyBalanceChange(date.getMonth() + 1, date.getFullYear()));
    points.unshift({ label: MONTH_ABBR[date.getMonth()], value: runningTotal });
  }

  return points;
}

// Cuánto cambió la suma de los saldos en un mes: todo lo que mueve dinero
// (ingresos, gastos, préstamos, deudas) menos las transferencias, que solo
// lo pasan de una cuenta propia a otra. Distinto de getMonthlyTotals, que
// cuenta solo ingresos y gastos.
export async function getMonthlyBalanceChange(month: number, year: number): Promise<number> {
  const database = await getDb();
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 1).toISOString();
  const row = await database.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(CASE
       WHEN type IN ('income', 'loan', 'debt_in') THEN amount
       WHEN type = 'transfer' THEN 0
       ELSE -amount END) as total
     FROM transactions WHERE date >= ? AND date < ?`,
    [start, end]
  );
  return row?.total ?? 0;
}

// Cuánto cambió el patrimonio (en pesos) desde `sinceIso` hasta hoy. Igual
// que getMonthlyBalanceChange, pero convierte cada movimiento desde la
// moneda de su cuenta: un gasto de US$10 no resta 10 pesos.
export async function getBalanceChangeSince(sinceIso: string): Promise<number> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ currency: string; total: number | null }>(
    `SELECT a.currency as currency, SUM(CASE
       WHEN t.type IN ('income', 'loan', 'debt_in') THEN t.amount
       WHEN t.type = 'transfer' THEN 0
       ELSE -t.amount END) as total
     FROM transactions t JOIN accounts a ON a.id = t.accountId
     WHERE t.date >= ?
     GROUP BY a.currency`,
    [sinceIso]
  );
  const rates = await getExchangeRates();
  return rows.reduce((sum, r) => sum + convertToCOP(r.total ?? 0, r.currency, rates), 0);
}

export type { NetWorthPeriod };

const DAY_MS = 86_400_000;

// Fechas de corte de cada periodo, de la más antigua a la más reciente
// (sin incluir "hoy", que se agrega aparte con el saldo actual).
function netWorthCutoffs(period: NetWorthPeriod, now: Date, firstTx: Date | null): Date[] {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysBack = (n: number, step: number) =>
    Array.from({ length: Math.floor(n / step) }, (_, i) => new Date(startOfDay.getTime() - (n - i * step) * DAY_MS));
  const monthsBack = (n: number) =>
    Array.from({ length: n }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1));

  switch (period) {
    case '7d':  return daysBack(7, 1);
    case '30d': return daysBack(30, 3);
    case '3m':  return daysBack(91, 7);
    case '6m':  return monthsBack(6);
    case '1a':  return monthsBack(12);
    case 'all': {
      if (!firstTx) return monthsBack(1);
      const months = (now.getFullYear() - firstTx.getFullYear()) * 12 + now.getMonth() - firstTx.getMonth() + 1;
      return monthsBack(Math.min(Math.max(months, 1), 60));
    }
  }
}

// Patrimonio total en distintos momentos del periodo, reconstruido hacia
// atrás desde el saldo actual (exacto: los saldos solo cambian con movimientos).
export async function getNetWorthSeries(
  period: NetWorthPeriod,
  now: Date = new Date()
): Promise<{ label: string; value: number; date: string }[]> {
  const database = await getDb();
  const currentTotal = await getTotalBalance();
  const first = await database.getFirstAsync<{ first: string | null }>(`SELECT MIN(date) as first FROM transactions`);
  const firstTx = first?.first ? new Date(first.first) : null;

  const daily = period === '7d' || period === '30d' || period === '3m';
  const points: { label: string; value: number; date: string }[] = [];
  for (const cutoff of netWorthCutoffs(period, now, firstTx)) {
    const change = await getBalanceChangeSince(cutoff.toISOString());
    points.push({
      label: daily ? `${cutoff.getDate()} ${MONTH_ABBR[cutoff.getMonth()]}` : `${MONTH_ABBR[cutoff.getMonth()]} ${String(cutoff.getFullYear()).slice(2)}`,
      value: currentTotal - change,
      date: cutoff.toISOString(),
    });
  }
  points.push({ label: 'Hoy', value: currentTotal, date: now.toISOString() });
  return points;
}

// Cambio del saldo de cada cuenta desde `sinceIso`, en la moneda de la
// cuenta. Las transferencias cuentan para las dos cuentas (sale de una y
// llega a la otra, con toAmount si fue entre monedas).
export async function getAccountChangesSince(sinceIso: string): Promise<Record<string, number>> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ id: string; delta: number | null }>(
    `SELECT accountId as id, SUM(CASE
       WHEN type IN ('income', 'loan', 'debt_in') THEN amount
       ELSE -amount END) as delta
     FROM transactions WHERE date >= ? GROUP BY accountId
     UNION ALL
     SELECT toAccountId as id, SUM(COALESCE(toAmount, amount)) as delta
     FROM transactions WHERE type = 'transfer' AND toAccountId IS NOT NULL AND date >= ?
     GROUP BY toAccountId`,
    [sinceIso, sinceIso]
  );
  const result: Record<string, number> = {};
  for (const r of rows) result[r.id] = (result[r.id] ?? 0) + (r.delta ?? 0);
  return result;
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

// Igual que getMonthlyTotals, pero para un rango de fechas arbitrario
// (usado por el resumen financiero semanal, que no calza con meses calendario)
export async function getTotalsInRange(
  startISO: string,
  endISO: string
): Promise<{ income: number; expense: number }> {
  const database = await getDb();

  const incomeRow = await database.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total
     FROM transactions
     WHERE type = 'income' AND date >= ? AND date < ?`,
    [startISO, endISO]
  );

  const expenseRow = await database.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total
     FROM transactions
     WHERE type IN ('expense','payment') AND date >= ? AND date < ?`,
    [startISO, endISO]
  );

  return {
    income: incomeRow?.total ?? 0,
    expense: expenseRow?.total ?? 0,
  };
}

// Igual que getCategoryBreakdown, pero para un rango de fechas arbitrario
export async function getCategoryBreakdownInRange(
  startISO: string,
  endISO: string
): Promise<{ categoryId: string; categoryName: string; categoryColor: string; total: number }[]> {
  const database = await getDb();

  const rows = await database.getAllAsync<{
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    total: number;
  }>(
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
    [startISO, endISO]
  );

  return rows;
}

export async function getRecentTransactions(
  limit: number = 5
): Promise<TransactionWithCategory[]> {
  const database = await getDb();

  const rows = await database.getAllAsync<TransactionRow>(
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

export async function getAllAccounts(): Promise<Account[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Account>(
    `SELECT * FROM accounts WHERE isActive = 1 ORDER BY createdAt ASC`
  );
  return rows;
}

export async function createAccount(
  name: string,
  type: string,
  balance: number,
  colorHex: string,
  iconName: string,
  currency: string = 'COP'
): Promise<void> {
  const database = await getDb();
  const id = newId('acc');
  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO accounts (id, name, type, balance, currency, colorHex, iconName, isActive, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [id, name, type, balance, currency, colorHex, iconName, now]
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

export async function getAllTransactionsWithCategory(): Promise<TransactionWithCategory[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<TransactionRow>(
    `SELECT
       t.*,
       c.name     as categoryName,
       c.iconName as categoryIcon,
       c.colorHex as categoryColor,
       a.name     as accountName,
       a.colorHex as accountColor,
       ta.name    as toAccountName,
       ta.currency as toAccountCurrency
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.categoryId
     LEFT JOIN accounts a ON a.id = t.accountId
     LEFT JOIN accounts ta ON ta.id = t.toAccountId
     ORDER BY t.date DESC`
  );
  return rows.map((r) => ({ ...r, tags: JSON.parse(r.tags || '[]') }));
}

export async function getAllCategories(): Promise<Category[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<CategoryRow>(
    `SELECT * FROM categories ORDER BY name ASC`
  );
  return rows.map((r) => ({
    ...r,
    subcategories: JSON.parse(r.subcategories || '[]'),
  }));
}

// IDs únicos aunque se creen varios en el mismo milisegundo (por ejemplo,
// al generar de una vez varios movimientos recurrentes pendientes).
let idCounter = 0;
function newId(prefix: string): string {
  idCounter = (idCounter + 1) % 1000;
  return `${prefix}-${Date.now()}-${idCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

type BalanceSource = Pick<TransactionInput, 'amount' | 'type' | 'accountId' | 'toAccountId'> & {
  toAmount?: number | null;
};

// Cómo afecta un movimiento a los saldos. Las transferencias mueven dinero
// entre dos cuentas propias: no son ingreso ni gasto, por eso los totales
// (getMonthlyTotals, etc.) ya las ignoran. Entre monedas distintas, sale
// `amount` (moneda de origen) y llega `toAmount` (moneda de destino).
function balanceEffects(tx: BalanceSource): { accountId: string; delta: number }[] {
  if (tx.type === 'transfer') {
    if (!tx.toAccountId) throw new Error('La transferencia necesita una cuenta destino');
    return [
      { accountId: tx.accountId, delta: -tx.amount },
      { accountId: tx.toAccountId, delta: tx.toAmount ?? tx.amount },
    ];
  }
  const positive = tx.type === 'income' || tx.type === 'loan' || tx.type === 'debt_in';
  return [{ accountId: tx.accountId, delta: positive ? tx.amount : -tx.amount }];
}

async function applyBalance(
  database: SQLite.SQLiteDatabase,
  tx: BalanceSource,
  direction: 1 | -1
): Promise<void> {
  for (const { accountId, delta } of balanceEffects(tx)) {
    await database.runAsync(
      `UPDATE accounts SET balance = balance + ? WHERE id = ?`,
      [delta * direction, accountId]
    );
  }
}

// Inserta sin abrir transacción propia: lo usan createTransaction y el
// generador de recurrentes, que ya están dentro de una.
async function insertTransaction(
  database: SQLite.SQLiteDatabase,
  input: TransactionInput
): Promise<string> {
  const id = newId('tx');
  await database.runAsync(
    `INSERT INTO transactions (id, amount, type, date, accountId, toAccountId, toAmount, categoryId, notes, receiptUri, tags, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?)`,
    [
      id, input.amount, input.type, input.date, input.accountId,
      input.type === 'transfer' ? input.toAccountId : null,
      input.type === 'transfer' ? input.toAmount ?? null : null,
      input.type === 'transfer' ? null : input.categoryId,
      input.notes, input.receiptUri ?? null, new Date().toISOString(),
    ]
  );
  await applyBalance(database, input, 1);
  return id;
}

// Todas las operaciones van dentro de una transacción de SQLite: si algo
// falla a mitad de camino, no queda un saldo descuadrado.
export async function createTransaction(input: TransactionInput): Promise<void> {
  const database = await getDb();
  await database.withTransactionAsync(async () => {
    await insertTransaction(database, input);
  });
}

export async function deleteTransaction(
  tx: Pick<Transaction, 'id' | 'amount' | 'type' | 'accountId' | 'toAccountId' | 'toAmount'>
): Promise<void> {
  const database = await getDb();
  await database.withTransactionAsync(async () => {
    await applyBalance(database, { ...tx, toAccountId: tx.toAccountId ?? null }, -1);
    await database.runAsync(`DELETE FROM transactions WHERE id = ?`, [tx.id]);
  });
}

export async function updateTransaction(
  id: string,
  previous: BalanceSource,
  updated: TransactionInput
): Promise<void> {
  const database = await getDb();
  await database.withTransactionAsync(async () => {
    // Revertir la versión original y aplicar la nueva (puede ser otra cuenta)
    await applyBalance(database, previous, -1);
    await applyBalance(database, updated, 1);
    await database.runAsync(
      `UPDATE transactions
       SET amount = ?, type = ?, date = ?, accountId = ?, toAccountId = ?, toAmount = ?, categoryId = ?, notes = ?, receiptUri = ?
       WHERE id = ?`,
      [
        updated.amount, updated.type, updated.date, updated.accountId,
        updated.type === 'transfer' ? updated.toAccountId : null,
        updated.type === 'transfer' ? updated.toAmount ?? null : null,
        updated.type === 'transfer' ? null : updated.categoryId,
        updated.notes, updated.receiptUri ?? null, id,
      ]
    );
  });
}

// Importa varios movimientos (extracto del banco) en una sola transacción:
// si uno falla, no queda importado ninguno ni un saldo a medias.
export async function importTransactions(inputs: TransactionInput[]): Promise<number> {
  if (inputs.length === 0) return 0;
  const database = await getDb();
  await database.withTransactionAsync(async () => {
    for (const input of inputs) await insertTransaction(database, input);
  });
  return inputs.length;
}

// ─── Movimientos recurrentes ───────────────────────────────

export async function getAllRecurring(): Promise<RecurringTransaction[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Omit<RecurringTransaction, 'isActive'> & { isActive: number }>(
    `SELECT r.*, a.name as accountName, c.name as categoryName
     FROM recurring_transactions r
     LEFT JOIN accounts a ON a.id = r.accountId
     LEFT JOIN categories c ON c.id = r.categoryId
     WHERE r.isActive = 1
     ORDER BY r.nextDate ASC`
  );
  return rows.map((r) => ({ ...r, isActive: !!r.isActive }));
}

// `firstDate` es la fecha del movimiento que el usuario acaba de registrar;
// la regla empieza a generar desde la siguiente repetición.
export async function createRecurring(
  input: Omit<TransactionInput, 'toAccountId'> & { type: 'income' | 'expense' },
  frequency: RecurrenceFrequency,
  firstDate: Date
): Promise<void> {
  const database = await getDb();
  const anchorDay = firstDate.getDate();
  const { next } = dueOccurrences(atLocalNoon(firstDate), frequency, anchorDay, firstDate);
  await database.runAsync(
    `INSERT INTO recurring_transactions
       (id, amount, type, accountId, categoryId, notes, frequency, anchorDay, nextDate, isActive, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      newId('rec'), input.amount, input.type, input.accountId,
      input.categoryId,
      input.notes, frequency, anchorDay, next.toISOString(), new Date().toISOString(),
    ]
  );
}

export async function deleteRecurring(id: string): Promise<void> {
  const database = await getDb();
  // Soft delete: los movimientos que ya generó se quedan
  await database.runAsync(`UPDATE recurring_transactions SET isActive = 0 WHERE id = ?`, [id]);
}

// Genera los movimientos recurrentes que ya vencieron. Se llama al abrir la
// app; devuelve cuántos movimientos creó.
export async function processDueRecurring(now: Date = new Date()): Promise<number> {
  const database = await getDb();
  const rules = await database.getAllAsync<RecurringTransaction>(
    `SELECT * FROM recurring_transactions WHERE isActive = 1 AND nextDate <= ?`,
    [now.toISOString()]
  );

  let created = 0;
  for (const rule of rules) {
    const { due, next } = dueOccurrences(new Date(rule.nextDate), rule.frequency, rule.anchorDay, now);
    await database.withTransactionAsync(async () => {
      for (const date of due) {
        await insertTransaction(database, {
          amount: rule.amount,
          type: rule.type,
          date: date.toISOString(),
          accountId: rule.accountId,
          toAccountId: null,
          categoryId: rule.categoryId,
          notes: rule.notes,
        });
      }
      await database.runAsync(
        `UPDATE recurring_transactions SET nextDate = ? WHERE id = ?`,
        [next.toISOString(), rule.id]
      );
    });
    created += due.length;
  }
  return created;
}
// ─── Deudas y préstamos ────────────────────────────────────
// Prestar o devolver dinero no es ingreso ni gasto: si el usuario elige una
// cuenta, se registra un movimiento debt_in / debt_out que solo mueve el
// saldo (los totales del mes los ignoran, igual que las transferencias).

type DebtRow = Omit<Debt, 'isSettled' | 'paidAmount' | 'remaining'> & {
  isSettled: number;
  paidAmount: number | null;
};

export async function getAllDebts(): Promise<Debt[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<DebtRow>(
    `SELECT d.*, (SELECT SUM(p.amount) FROM debt_payments p WHERE p.debtId = d.id) as paidAmount
     FROM debts d
     ORDER BY d.isSettled ASC, COALESCE(d.dueDate, '9999') ASC, d.createdAt DESC`
  );
  return rows.map((r) => {
    const paid = r.paidAmount ?? 0;
    return { ...r, isSettled: !!r.isSettled, paidAmount: paid, remaining: Math.max(r.amount - paid, 0) };
  });
}

export async function getDebtPayments(debtId: string): Promise<DebtPayment[]> {
  const database = await getDb();
  return database.getAllAsync<DebtPayment>(
    `SELECT * FROM debt_payments WHERE debtId = ? ORDER BY date DESC`,
    [debtId]
  );
}

export interface DebtInput {
  direction: DebtDirection;
  personName: string;
  amount: number;
  notes: string;
  date: string;
  dueDate: string | null;
  accountId: string | null; // null = no mover dinero de ninguna cuenta
}

// Inserta la deuda sin abrir transacción propia (la usan createDebt y
// createSplitExpense, que ya están dentro de una). txNotes: nota del
// movimiento que mueve el dinero, si se eligió una cuenta.
async function insertDebt(database: SQLite.SQLiteDatabase, input: DebtInput, txNotes?: string): Promise<string> {
  const id = newId('debt');
  let transactionId: string | null = null;
  if (input.accountId) {
    // Le presto a alguien: sale dinero. Alguien me presta: entra dinero.
    transactionId = await insertTransaction(database, {
      amount: input.amount,
      type: input.direction === 'owed_to_me' ? 'debt_out' : 'debt_in',
      date: input.date,
      accountId: input.accountId,
      toAccountId: null,
      categoryId: null,
      notes: txNotes ?? (input.direction === 'owed_to_me' ? `Préstamo a ${input.personName}` : `Préstamo de ${input.personName}`),
    });
  }
  await database.runAsync(
    `INSERT INTO debts (id, direction, personName, amount, notes, date, dueDate, accountId, transactionId, isSettled, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, input.direction, input.personName, input.amount, input.notes, input.date,
      input.dueDate, input.accountId, transactionId, new Date().toISOString()]
  );
  return id;
}

export async function createDebt(input: DebtInput): Promise<string> {
  const database = await getDb();
  let id = '';
  await database.withTransactionAsync(async () => {
    id = await insertDebt(database, input);
  });
  return id;
}

// Gasto compartido: el usuario pagó todo desde su cuenta. Se registra como
// gasto solo SU parte (lo que cuenta en reportes y presupuestos) y cada
// persona queda debiéndole la suya. La cuenta baja el total, porque el
// dinero sí salió completo. Todo en una sola transacción.
export async function createSplitExpense(input: TransactionInput, people: string[]): Promise<void> {
  if (input.type !== 'expense') throw new Error('Solo se pueden dividir gastos');
  const names = people.map((p) => p.trim()).filter(Boolean);
  if (names.length === 0) throw new Error('Agrega al menos una persona');
  const { myShare, otherShare } = splitAmount(input.amount, names.length + 1);
  const label = input.notes || 'Gasto compartido';

  const database = await getDb();
  await database.withTransactionAsync(async () => {
    await insertTransaction(database, { ...input, amount: myShare });
    for (const name of names) {
      await insertDebt(
        database,
        {
          direction: 'owed_to_me', personName: name, amount: otherShare,
          notes: label, date: input.date, dueDate: null, accountId: input.accountId,
        },
        `${label} (parte de ${name})`
      );
    }
  });
}

// Registra un abono. Cuando lo pendiente llega a cero, la deuda queda
// saldada. Devuelve true si con este abono se saldó.
export async function addDebtPayment(
  debtId: string,
  amount: number,
  date: string,
  accountId: string | null
): Promise<boolean> {
  const database = await getDb();
  const debt = (await getAllDebts()).find((d) => d.id === debtId);
  if (!debt) throw new Error('La deuda no existe');
  if (!(amount > 0)) throw new Error('El abono debe ser mayor que cero');
  if (amount > debt.remaining + 0.005) {
    throw new Error(`El abono supera lo pendiente (${Math.round(debt.remaining)})`);
  }

  const settles = debt.remaining - amount <= 0.005;
  await database.withTransactionAsync(async () => {
    let transactionId: string | null = null;
    if (accountId) {
      // Me pagan lo que me deben: entra dinero. Pago lo que debo: sale.
      transactionId = await insertTransaction(database, {
        amount,
        type: debt.direction === 'owed_to_me' ? 'debt_in' : 'debt_out',
        date,
        accountId,
        toAccountId: null,
        categoryId: null,
        notes: debt.direction === 'owed_to_me' ? `Abono de ${debt.personName}` : `Abono a ${debt.personName}`,
      });
    }
    await database.runAsync(
      `INSERT INTO debt_payments (id, debtId, amount, date, accountId, transactionId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newId('dpay'), debtId, amount, date, accountId, transactionId, new Date().toISOString()]
    );
    if (settles) {
      await database.runAsync(
        `UPDATE debts SET isSettled = 1, settledAt = ? WHERE id = ?`,
        [new Date().toISOString(), debtId]
      );
    }
  });
  return settles;
}

// Borra la deuda, sus abonos y los movimientos que generaron (revirtiendo
// los saldos de las cuentas), como si nunca se hubiera registrado.
export async function deleteDebt(id: string): Promise<void> {
  const database = await getDb();
  const debt = await database.getFirstAsync<{ transactionId: string | null }>(
    `SELECT transactionId FROM debts WHERE id = ?`, [id]
  );
  if (!debt) return;
  const payments = await getDebtPayments(id);
  const txIds = [debt.transactionId, ...payments.map((p) => p.transactionId)].filter(
    (t): t is string => !!t
  );

  await database.withTransactionAsync(async () => {
    for (const txId of txIds) {
      const tx = await database.getFirstAsync<Transaction>(`SELECT * FROM transactions WHERE id = ?`, [txId]);
      if (!tx) continue;
      await applyBalance(database, { ...tx, toAccountId: tx.toAccountId ?? null }, -1);
      await database.runAsync(`DELETE FROM transactions WHERE id = ?`, [txId]);
    }
    await database.runAsync(`DELETE FROM debt_payments WHERE debtId = ?`, [id]);
    await database.runAsync(`DELETE FROM debts WHERE id = ?`, [id]);
  });
}

// ─── Queries de Metas ───────────────────────────────────────

export async function getAllGoals(): Promise<Goal[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Goal>(
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
  const id = newId('goal');
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
  // Sus aportes automáticos dejan de tener a dónde ir
  await database.runAsync(`UPDATE goal_auto_contributions SET isActive = 0 WHERE goalId = ?`, [id]);
}

// ─── Aportes automáticos a metas ───────────────────────────
// "$100.000 cada quincena a la meta Viaje". Igual que los aportes manuales,
// suman a la meta sin mover el saldo de ninguna cuenta.

export async function getGoalAutoContributions(): Promise<GoalAutoContribution[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Omit<GoalAutoContribution, 'isActive'> & { isActive: number }>(
    `SELECT * FROM goal_auto_contributions WHERE isActive = 1 ORDER BY nextDate ASC`
  );
  return rows.map((r) => ({ ...r, isActive: !!r.isActive }));
}

// `firstDate` = el aporte que el usuario acaba de hacer a mano; la regla
// empieza a aportar desde la siguiente repetición. Reemplaza la regla
// anterior de esa meta, si había.
export async function createGoalAutoContribution(
  goalId: string,
  amount: number,
  frequency: RecurrenceFrequency,
  firstDate: Date = new Date()
): Promise<void> {
  if (!(amount > 0)) throw new Error('El aporte debe ser mayor que cero');
  const database = await getDb();
  const anchorDay = firstDate.getDate();
  const { next } = dueOccurrences(atLocalNoon(firstDate), frequency, anchorDay, firstDate);
  await database.withTransactionAsync(async () => {
    await database.runAsync(`UPDATE goal_auto_contributions SET isActive = 0 WHERE goalId = ?`, [goalId]);
    await database.runAsync(
      `INSERT INTO goal_auto_contributions (id, goalId, amount, frequency, anchorDay, nextDate, isActive, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [newId('gauto'), goalId, amount, frequency, anchorDay, next.toISOString(), new Date().toISOString()]
    );
  });
}

export async function deleteGoalAutoContribution(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(`UPDATE goal_auto_contributions SET isActive = 0 WHERE id = ?`, [id]);
}

// Aplica los aportes vencidos al abrir la app. Si la meta se completa (o ya
// no existe), la regla se detiene sola. Devuelve cuántos aportes aplicó.
export async function processDueGoalContributions(now: Date = new Date()): Promise<number> {
  const database = await getDb();
  const rules = await database.getAllAsync<GoalAutoContribution>(
    `SELECT * FROM goal_auto_contributions WHERE isActive = 1 AND nextDate <= ?`,
    [now.toISOString()]
  );

  let applied = 0;
  for (const rule of rules) {
    const { due, next } = dueOccurrences(new Date(rule.nextDate), rule.frequency, rule.anchorDay, now);
    await database.withTransactionAsync(async () => {
      let stop = false;
      for (let i = 0; i < due.length; i++) {
        const goal = await database.getFirstAsync<{ isCompleted: number }>(
          `SELECT isCompleted FROM goals WHERE id = ?`, [rule.goalId]
        );
        if (!goal || goal.isCompleted) { stop = true; break; }
        await database.runAsync(`UPDATE goals SET currentAmount = currentAmount + ? WHERE id = ?`, [rule.amount, rule.goalId]);
        await database.runAsync(
          `UPDATE goals SET isCompleted = 1 WHERE id = ? AND currentAmount >= targetAmount`, [rule.goalId]
        );
        applied++;
      }
      const after = await database.getFirstAsync<{ isCompleted: number }>(
        `SELECT isCompleted FROM goals WHERE id = ?`, [rule.goalId]
      );
      if (stop || !after || after.isCompleted) {
        await database.runAsync(`UPDATE goal_auto_contributions SET isActive = 0 WHERE id = ?`, [rule.id]);
      } else {
        await database.runAsync(`UPDATE goal_auto_contributions SET nextDate = ? WHERE id = ?`, [next.toISOString(), rule.id]);
      }
    });
  }
  return applied;
}

export async function updateGoal(
  id: string,
  name: string,
  targetAmount: number,
  targetDate: string,
  priority: string,
  colorHex: string,
  iconName: string
): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `UPDATE goals
     SET name = ?, targetAmount = ?, targetDate = ?, priority = ?, colorHex = ?, iconName = ?
     WHERE id = ?`,
    [name, targetAmount, targetDate, priority, colorHex, iconName, id]
  );
}
// ─── Queries de Suscripciones ──────────────────────────────

export async function getAllSubscriptions(): Promise<Subscription[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Subscription>(
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
  const id = newId('sub');
  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO subscriptions
       (id, name, amount, frequency, nextBillingDate, anchorDay, iconName, colorHex, isActive, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [id, name, amount, frequency, nextBillingDate, new Date(nextBillingDate).getDate(), iconName, colorHex, now]
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

export async function updateSubscription(
  id: string,
  name: string,
  amount: number,
  frequency: string,
  nextBillingDate: string,
  colorHex: string,
  iconName: string
): Promise<void> {
  const database = await getDb();
  // Si el usuario cambia la fecha, ese pasa a ser el nuevo día de cobro
  await database.runAsync(
    `UPDATE subscriptions
     SET name = ?, amount = ?, frequency = ?, nextBillingDate = ?, anchorDay = ?, colorHex = ?, iconName = ?
     WHERE id = ?`,
    [name, amount, frequency, nextBillingDate, new Date(nextBillingDate).getDate(), colorHex, iconName, id]
  );
}

// Avanza al siguiente cobro las suscripciones cuya fecha ya pasó. Se llama
// al abrir la app y al cargar Suscripciones. Devuelve las que cambiaron,
// para reprogramar sus recordatorios.
export async function advanceDueSubscriptions(now: Date = new Date()): Promise<Subscription[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Subscription>(
    `SELECT * FROM subscriptions WHERE isActive = 1`
  );

  const advanced: Subscription[] = [];
  for (const sub of rows) {
    // Suscripciones creadas antes de existir anchorDay: se toma el día de su
    // fecha actual, que todavía no se ha corrido por ningún mes corto
    const anchorDay = sub.anchorDay ?? new Date(sub.nextBillingDate).getDate();
    const next = advanceBillingDate(sub.nextBillingDate, sub.frequency, anchorDay, now);
    if (!next) continue;
    await database.runAsync(
      `UPDATE subscriptions SET nextBillingDate = ?, anchorDay = ? WHERE id = ?`,
      [next, anchorDay, sub.id]
    );
    advanced.push({ ...sub, nextBillingDate: next, anchorDay });
  }
  return advanced;
}
// ─── Queries de Reportes ────────────────────────────────────

export async function getCategoryBreakdown(
  month: number,
  year: number
): Promise<{ categoryId: string; categoryName: string; categoryColor: string; total: number }[]> {
  const database = await getDb();
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 1).toISOString();

  const rows = await database.getAllAsync<{
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    total: number;
  }>(
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
): Promise<Transaction[]> {
  const database = await getDb();
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 1).toISOString();

  const rows = await database.getAllAsync<Omit<Transaction, 'tags'> & { tags: string }>(
    `SELECT * FROM transactions
     WHERE categoryId = ? AND date >= ? AND date < ?
     ORDER BY date DESC`,
    [categoryId, start, end]
  );

  return rows.map((r) => ({ ...r, tags: JSON.parse(r.tags || '[]') }));
}

// ─── Queries de Tarjetas ───────────────────────────────────

export async function getAllCards(): Promise<Card[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<CardRow>(
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
  const id  = newId('card');
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

// ─── Queries de Estadísticas de Perfil ─────────────────────

export async function getGlobalStats(): Promise<{
  totalTransactions: number;
  totalIncome: number;
  totalExpenses: number;
  oldestTransactionDate: string | null;
  completedGoals: number;
  activeGoals: number;
}> {
  const database = await getDb();

  const txCount = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions`
  );

  const totals = await database.getFirstAsync<{
    income: number | null;
    expenses: number | null;
  }>(
    `SELECT
       SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
       SUM(CASE WHEN type IN ('expense','payment') THEN amount ELSE 0 END) as expenses
     FROM transactions`
  );

  const oldest = await database.getFirstAsync<{ date: string | null }>(
    `SELECT MIN(date) as date FROM transactions`
  );

  const goalsCompleted = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM goals WHERE isCompleted = 1`
  );

  const goalsActive = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM goals WHERE isCompleted = 0`
  );

  return {
    totalTransactions: txCount?.count ?? 0,
    totalIncome:       totals?.income   ?? 0,
    totalExpenses:     totals?.expenses ?? 0,
    oldestTransactionDate: oldest?.date ?? null,
    completedGoals:    goalsCompleted?.count ?? 0,
    activeGoals:       goalsActive?.count    ?? 0,
  };
}

export async function getAverageMonthlySavings(): Promise<number> {
  const database = await getDb();

  const rows = await database.getAllAsync<{
    month: string;
    income: number;
    expenses: number;
  }>(
    `SELECT
       strftime('%Y-%m', date) as month,
       SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
       SUM(CASE WHEN type IN ('expense','payment') THEN amount ELSE 0 END) as expenses
     FROM transactions
     GROUP BY month
     ORDER BY month ASC`
  );

  if (rows.length === 0) return 0;

  const totalSavings = rows.reduce((sum, row) => sum + (row.income - row.expenses), 0);
  return totalSavings / rows.length;
}

// ─── Queries de Alertas ─────────────────────────────────────

export async function getAllAlerts(): Promise<Alert[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Alert>(
    `SELECT * FROM alerts WHERE isActive = 1 ORDER BY createdAt DESC`
  );
  return rows;
}

export async function createAlert(
  title: string,
  type: string,
  condition: string,
  threshold: number,
  categoryId: string | null
): Promise<void> {
  const database = await getDb();
  const id  = newId('alert');
  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO alerts (id, title, type, condition, threshold, categoryId, isActive, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    [id, title, type, condition, threshold, categoryId, now]
  );
}

export async function updateAlertTriggered(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `UPDATE alerts SET lastTriggered = ? WHERE id = ?`,
    [new Date().toISOString(), id]
  );
}

export async function deleteAlert(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(`DELETE FROM alerts WHERE id = ?`, [id]);
}

// ─── Queries de Presupuestos ─────────────────────────────────

type BudgetRow = Omit<Budget, 'categoryLimits' | 'isAIGenerated'> & {
  categoryLimits: string;
  isAIGenerated: number;
};

function mapBudgetRow(row: BudgetRow): Budget {
  return {
    ...row,
    categoryLimits: JSON.parse(row.categoryLimits || '{}'),
    isAIGenerated: !!row.isAIGenerated,
  };
}

export async function getBudgetForMonth(month: number, year: number): Promise<Budget | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<BudgetRow>(
    `SELECT * FROM budgets WHERE month = ? AND year = ?`,
    [month, year]
  );
  return row ? mapBudgetRow(row) : null;
}

export async function upsertBudget(
  month: number,
  year: number,
  totalLimit: number,
  categoryLimits: Record<string, number>,
  isAIGenerated: boolean = false
): Promise<void> {
  const database = await getDb();
  const now = new Date().toISOString();
  const limitsJson = JSON.stringify(categoryLimits);

  const existing = await database.getFirstAsync<{ id: string }>(
    `SELECT id FROM budgets WHERE month = ? AND year = ?`,
    [month, year]
  );

  if (existing) {
    await database.runAsync(
      `UPDATE budgets SET totalLimit = ?, categoryLimits = ?, isAIGenerated = ? WHERE id = ?`,
      [totalLimit, limitsJson, isAIGenerated ? 1 : 0, existing.id]
    );
  } else {
    const id = newId('budget');
    await database.runAsync(
      `INSERT INTO budgets (id, month, year, totalLimit, categoryLimits, isAIGenerated, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, month, year, totalLimit, limitsJson, isAIGenerated ? 1 : 0, now]
    );
  }
}

export async function deleteBudget(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(`DELETE FROM budgets WHERE id = ?`, [id]);
}

// ─── Queries de Retos Financieros ────────────────────────────

export async function getAllChallenges(): Promise<Challenge[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Challenge>(
    `SELECT * FROM challenges ORDER BY createdAt DESC`
  );
  return rows;
}

export async function createChallenge(
  title: string,
  description: string,
  categoryId: string,
  startDate: string,
  endDate: string
): Promise<void> {
  const database = await getDb();
  const id = newId('challenge');
  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO challenges (id, title, description, categoryId, startDate, endDate, status, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
    [id, title, description, categoryId, startDate, endDate, now]
  );
}

export async function updateChallengeStatus(id: string, status: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(`UPDATE challenges SET status = ? WHERE id = ?`, [status, id]);
}

export async function deleteChallenge(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(`DELETE FROM challenges WHERE id = ?`, [id]);
}

// Suma de gastos de una categoría dentro de un rango de fechas (para
// evaluar si un reto de "no gastar en X" sigue en pie)
export async function getCategorySpentInRange(
  categoryId: string,
  startISO: string,
  endISO: string
): Promise<number> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total
     FROM transactions
     WHERE categoryId = ? AND type IN ('expense','payment') AND date >= ? AND date < ?`,
    [categoryId, startISO, endISO]
  );
  return row?.total ?? 0;
}