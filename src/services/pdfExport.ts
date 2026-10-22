import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { loadMonthlyReport } from './report/reportData';
import { buildReportHtml } from './report/reportHtml';

// Genera el informe mensual completo (con la identidad de Smart Finance)
// y abre el menú de compartir. Igual que el CSV y el respaldo, la app no
// sube nada por su cuenta: el usuario decide a dónde va el archivo.
export async function exportReportToPdf(now: Date = new Date()): Promise<void> {
  const data = await loadMonthlyReport(now);
  const html = buildReportHtml(data);

  // Tamaño carta (612×792 pt). Los márgenes los pone el CSS (@page)
  const { uri } = await Print.printToFileAsync({ html, width: 612, height: 792 });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Compartir no está disponible en este dispositivo');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `Informe Smart Finance · ${data.periodLabel}`,
  });
}
