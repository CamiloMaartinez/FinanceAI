import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatCurrency } from '../utils/currency';
import type { CategoryBreakdownItem } from '../hooks/useReports';

interface ExportReportParams {
  breakdown: CategoryBreakdownItem[];
  currentMonthExpense: number;
  previousMonthExpense: number;
  monthOverMonthChange: number;
}

function buildReportHtml(params: ExportReportParams): string {
  const { breakdown, currentMonthExpense, previousMonthExpense, monthOverMonthChange } = params;

  const monthName = new Date().toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });

  const isIncrease = monthOverMonthChange > 0;
  const changeLabel = previousMonthExpense > 0
    ? `${isIncrease ? '+' : ''}${monthOverMonthChange.toFixed(0)}% vs mes anterior`
    : 'Sin datos del mes anterior';

  const categoryRows = breakdown.map((item) => `
    <tr>
      <td style="padding:10px 0;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:${item.categoryColor};margin-right:8px;"></span>
        ${item.categoryName}
      </td>
      <td style="padding:10px 0;text-align:right;color:#888;">${item.percentage.toFixed(0)}%</td>
      <td style="padding:10px 0;text-align:right;font-weight:600;">${formatCurrency(item.total)}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: -apple-system, Helvetica, Arial, sans-serif;
            padding: 32px;
            color: #1a1a1a;
          }
          h1 {
            font-size: 22px;
            margin-bottom: 4px;
          }
          .subtitle {
            color: #888;
            font-size: 13px;
            margin-bottom: 24px;
            text-transform: capitalize;
          }
          .summary {
            display: flex;
            justify-content: space-between;
            background: #f5f5f7;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
          }
          .summary-item {
            text-align: center;
          }
          .summary-label {
            font-size: 12px;
            color: #888;
          }
          .summary-value {
            font-size: 20px;
            font-weight: 700;
            margin-top: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th {
            text-align: left;
            font-size: 12px;
            color: #888;
            border-bottom: 1px solid #eee;
            padding-bottom: 8px;
          }
          tr {
            border-bottom: 1px solid #f0f0f0;
          }
          .footer {
            margin-top: 32px;
            font-size: 11px;
            color: #aaa;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <h1>Reporte Financiero — FinanceAI</h1>
        <div class="subtitle">${monthName}</div>

        <div class="summary">
          <div class="summary-item">
            <div class="summary-label">Mes anterior</div>
            <div class="summary-value">${formatCurrency(previousMonthExpense)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Este mes</div>
            <div class="summary-value">${formatCurrency(currentMonthExpense)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Variación</div>
            <div class="summary-value" style="color:${isIncrease ? '#FF3B30' : '#34C759'};font-size:14px;">
              ${changeLabel}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Categoría</th>
              <th style="text-align:right;">%</th>
              <th style="text-align:right;">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${categoryRows || '<tr><td colspan="3" style="padding:20px 0;text-align:center;color:#888;">Sin gastos registrados este mes</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          Generado por FinanceAI el ${new Date().toLocaleDateString('es-CO')}
        </div>
      </body>
    </html>
  `;
}

export async function exportReportToPdf(params: ExportReportParams): Promise<void> {
  const html = buildReportHtml(params);

  // Genera el PDF y obtiene la ruta del archivo temporal
  const { uri } = await Print.printToFileAsync({ html });

  // Verifica si el dispositivo puede compartir archivos
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Compartir reporte financiero',
    });
  }
}