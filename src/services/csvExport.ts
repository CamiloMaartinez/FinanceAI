import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getAllAccounts, getAllTransactionsWithCategory } from '../database/db';
import { buildTransactionsCsv } from '../utils/csv';

// Exporta todos los movimientos del perfil activo a un CSV y abre el menú
// de compartir (Archivos, OneDrive, correo...). Igual que el respaldo, la
// app no sube nada por su cuenta. Devuelve cuántos movimientos exportó.
export async function exportTransactionsCsv(): Promise<number> {
  const [transactions, accounts] = await Promise.all([
    getAllTransactionsWithCategory(),
    getAllAccounts(),
  ]);

  if (transactions.length === 0) {
    throw new Error('No tienes movimientos para exportar');
  }

  const dateLabel = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `financeai-movimientos-${dateLabel}.csv`);
  if (file.exists) file.delete();
  file.create();
  file.write(buildTransactionsCsv(transactions, accounts));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Compartir no está disponible en este dispositivo');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: 'Exportar movimientos de FinanceAI',
  });

  return transactions.length;
}
