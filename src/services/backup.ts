import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDb } from '../database/db';

const BACKUP_VERSION = 1;

// Todas las tablas que respaldamos, en el orden correcto para poder
// restaurarlas después sin violar relaciones (categorías y cuentas antes
// que lo que depende de ellas).
const BACKUP_TABLES = [
  'categories',
  'accounts',
  'transactions',
  'goals',
  'subscriptions',
  'cards',
  'alerts',
  'budgets',
  'challenges',
] as const;

interface BackupData {
  version: number;
  exportedAt: string;
  tables: Record<string, any[]>;
}

// Exporta TODA la base de datos a un archivo JSON y abre el menú nativo de
// compartir para que el usuario decida dónde guardarlo (Archivos/iCloud,
// Google Drive, por correo, etc. — la app no sube nada automáticamente).
export async function exportBackup(): Promise<void> {
  const database = await getDb();
  const tables: Record<string, any[]> = {};

  for (const table of BACKUP_TABLES) {
    tables[table] = await database.getAllAsync(`SELECT * FROM ${table}`);
  }

  const backup: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
  };

  const dateLabel = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `financeai-backup-${dateLabel}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(backup, null, 2));

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Compartir no está disponible en este dispositivo');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Guardar respaldo de FinanceAI',
  });
}

// Deja que el usuario elija un archivo de respaldo (.json) y valida que
// tenga la forma esperada, sin tocar la base de datos todavía.
export async function pickBackupFile(): Promise<{ uri: string; data: BackupData } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const file = new File(result.assets[0].uri);
  const text = await file.text();
  const data = JSON.parse(text) as BackupData;

  if (!data || typeof data.version !== 'number' || !data.tables) {
    throw new Error('El archivo no parece ser un respaldo válido de FinanceAI');
  }

  return { uri: result.assets[0].uri, data };
}

// Reemplaza TODOS los datos actuales por los del respaldo. Se ejecuta
// dentro de una transacción: si algo falla a mitad de camino, no queda la
// base de datos a medio restaurar.
export async function restoreBackup(data: BackupData): Promise<void> {
  const database = await getDb();

  await database.withTransactionAsync(async () => {
    // Borramos en orden inverso (lo que depende de otras tablas primero)
    for (const table of [...BACKUP_TABLES].reverse()) {
      await database.execAsync(`DELETE FROM ${table};`);
    }

    // Insertamos en el orden correcto
    for (const table of BACKUP_TABLES) {
      const rows = data.tables[table] ?? [];
      for (const row of rows) {
        const columns = Object.keys(row);
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map((col) => row[col]);
        await database.runAsync(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
          values
        );
      }
    }
  });
}
