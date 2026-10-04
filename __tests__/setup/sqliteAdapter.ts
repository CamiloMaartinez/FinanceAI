// Reemplazo de expo-sqlite para las pruebas: implementa la misma API
// asíncrona que usa src/database/db.ts, pero sobre el SQLite que trae Node
// (node:sqlite), con una base de datos nueva en memoria por cada apertura.
// Así se prueba el SQL real de la app sin necesidad de un teléfono.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite');

type Params = unknown[] | undefined;

class TestDatabase {
  // expo-sqlite no activa las llaves foráneas (PRAGMA foreign_keys = OFF,
  // el valor por defecto de SQLite); node:sqlite sí. Igualamos al teléfono.
  private db = new DatabaseSync(':memory:', { enableForeignKeyConstraints: false });

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async runAsync(sql: string, params?: Params): Promise<{ changes: number; lastInsertRowId: number }> {
    const result = this.db.prepare(sql).run(...(params ?? []));
    return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
  }

  async getAllAsync<T>(sql: string, params?: Params): Promise<T[]> {
    return this.db.prepare(sql).all(...(params ?? [])).map((row: object) => ({ ...row })) as T[];
  }

  async getFirstAsync<T>(sql: string, params?: Params): Promise<T | null> {
    const row = this.db.prepare(sql).get(...(params ?? []));
    return row ? ({ ...row } as T) : null;
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    this.db.exec('BEGIN');
    try {
      await task();
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }
}

export type SQLiteDatabase = TestDatabase;

export async function openDatabaseAsync(_name: string): Promise<TestDatabase> {
  return new TestDatabase();
}
