// Plantilla HTML del informe mensual. expo-print la convierte en PDF con el
// motor web del sistema (WKWebView en iOS, WebView en Android), así que todo
// va incrustado: estilos, logo (data URI), Moni y gráficas en SVG.
//
// Identidad visual: la misma de la app (src/constants/theme.ts) — portada
// índigo como el logotipo, lavanda y durazno de acento, verde lima para
// ingresos, magenta para gastos y la tipografía Outfit.

import { formatCurrency, formatCurrencyCompact } from '../../utils/currency';
import { formatWithCurrency } from '../../constants/currencies';
import { lightColors, darkColors, pastels, ink } from '../../constants/theme';
import { mascotSvg } from '../../components/mascot/mascotSvg';
import { BRAND_LOGO_DATA_URI, BRAND_LOGO_RATIO } from './brandLogo';
import type {
  BudgetStatus,
  InsightTone,
  MonthlyReportData,
  ReportCategory,
  ReportTrendPoint,
} from '../../utils/reportCalculations';

// ─── Tokens de marca ────────────────────────────────────────
const brand = {
  night: darkColors.background,      // #1B1240 fondo del logotipo
  indigo: lightColors.primary,       // #2E1A78
  violet: lightColors.purple,        // #6B3FC9
  lavender: lightColors.hero,        // #B9BCF6
  lavenderSoft: pastels.lavender,    // #D9DAFB
  peach: pastels.peach,              // #F8C98F
  paper: lightColors.background,     // #F4F3FF
  card: lightColors.surface,
  ink,                               // #2A1B6B
  inkSoft: lightColors.textSecondary,
  inkMuted: lightColors.textTertiary,
  border: 'rgba(42,27,107,0.10)',
  incomeText: lightColors.income,    // #467010 (AA sobre blanco)
  incomeBar: lightColors.lime,       // #8DBF3F
  expenseText: lightColors.expense,  // #A53AAD (AA sobre blanco)
  expenseBar: lightColors.magenta,   // #C95BD0
} as const;

const TONE: Record<InsightTone, { bg: string; dot: string; label: string }> = {
  warning: { bg: pastels.pink, dot: brand.expenseText, label: 'Atención' },
  good: { bg: pastels.mint, dot: brand.incomeText, label: 'Bien' },
  info: { bg: pastels.lavender, dot: brand.indigo, label: 'Dato' },
};

const STATUS: Record<BudgetStatus, { bar: string; text: string; label: string }> = {
  ok: { bar: brand.incomeBar, text: brand.incomeText, label: 'Bajo control' },
  warning: { bar: brand.peach, text: '#8A4B00', label: 'Cerca del límite' },
  over: { bar: brand.expenseBar, text: brand.expenseText, label: 'Excedido' },
};

// ─── Utilidades ─────────────────────────────────────────────

/** Los nombres y notas los escribe el usuario: nunca van crudos al HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Solo colores #RGB / #RRGGBB: un color raro no debe romper el CSS. */
function safeColor(hex: string | undefined, fallback: string = brand.lavenderSoft): string {
  return hex && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex) ? hex : fallback;
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
const pct = (n: number) => `${Math.round(n)}%`;
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const clamp = (n: number) => Math.max(0, Math.min(n, 100));

function logo(height: number): string {
  return `<img src="${BRAND_LOGO_DATA_URI}" alt="" style="height:${height}px;width:${Math.round(height * BRAND_LOGO_RATIO)}px"/>`;
}

function section(title: string, subtitle: string, body: string): string {
  return `
    <section class="section">
      <div class="section-head">
        <h2>${title}</h2>
        ${subtitle ? `<p class="muted">${subtitle}</p>` : ''}
      </div>
      ${body}
    </section>`;
}

function bar(percent: number, color: string): string {
  return `<div class="bar"><span style="width:${clamp(percent).toFixed(1)}%;background:${color}"></span></div>`;
}

function swatch(color: string): string {
  return `<span class="swatch" style="background:${safeColor(color)}"></span>`;
}

// ─── Gráficas (SVG) ─────────────────────────────────────────

/** Dona de gastos por categoría: un arco por categoría con stroke-dasharray. */
export function donutSvg(categories: ReportCategory[], total: number): string {
  const size = 180;
  const r = 66;
  const stroke = 26;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const arcs = categories
    .filter((c) => c.total > 0)
    .map((c) => {
      const len = (c.percentage / 100) * circ;
      const arc = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${safeColor(c.color)}"
        stroke-width="${stroke}" stroke-dasharray="${len.toFixed(2)} ${(circ - len).toFixed(2)}"
        stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
      offset += len;
      return arc;
    })
    .join('');
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Gastos por categoría">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${brand.paper}" stroke-width="${stroke}"/>
      ${arcs}
      <text x="50%" y="${size / 2 - 4}" text-anchor="middle" class="svg-big">${escapeHtml(formatCurrencyCompact(total))}</text>
      <text x="50%" y="${size / 2 + 16}" text-anchor="middle" class="svg-small">gastado</text>
    </svg>`;
}

/** Barras de ingresos (lima) y gastos (magenta) de los últimos meses. */
export function trendSvg(points: ReportTrendPoint[]): string {
  const width = 640;
  const height = 190;
  const top = 18;
  const bottom = 28;
  const plotH = height - top - bottom;
  const max = Math.max(1, ...points.flatMap((p) => [p.income, p.expense]));
  const left = 52; // espacio para las etiquetas del eje
  const groupW = (width - left) / Math.max(points.length, 1);
  const barW = Math.min(26, groupW / 4);
  const y = (v: number) => top + plotH - (v / max) * plotH;

  const grid = [0.25, 0.5, 0.75, 1]
    .map((f) => {
      const gy = top + plotH - f * plotH;
      return `<line x1="${left}" x2="${width}" y1="${gy}" y2="${gy}" stroke="${brand.border}" stroke-width="1"/>
        <text x="${left - 8}" y="${gy + 4}" text-anchor="end" class="svg-axis">${escapeHtml(formatCurrencyCompact(max * f))}</text>`;
    })
    .join('');

  const bars = points
    .map((p, i) => {
      const cx = left + groupW * i + groupW / 2;
      const last = i === points.length - 1;
      const inH = Math.max(p.income > 0 ? 2 : 0, top + plotH - y(p.income));
      const exH = Math.max(p.expense > 0 ? 2 : 0, top + plotH - y(p.expense));
      return `
        <rect x="${cx - barW - 2}" y="${top + plotH - inH}" width="${barW}" height="${inH}" rx="5" fill="${brand.incomeBar}"/>
        <rect x="${cx + 2}" y="${top + plotH - exH}" width="${barW}" height="${exH}" rx="5" fill="${brand.expenseBar}"/>
        <text x="${cx}" y="${height - 8}" text-anchor="middle" class="svg-label${last ? ' svg-label-strong' : ''}">${p.label}</text>`;
    })
    .join('');

  return `<svg width="100%" viewBox="0 0 ${width} ${height}" role="img" aria-label="Ingresos y gastos de los últimos meses">
    ${grid}${bars}
    <line x1="${left}" x2="${width}" y1="${top + plotH}" y2="${top + plotH}" stroke="${brand.inkMuted}" stroke-width="1"/>
  </svg>`;
}

// ─── Secciones ──────────────────────────────────────────────

function cover(d: MonthlyReportData): string {
  const savings = d.savingsRate === null ? '—' : pct(d.savingsRate);
  const kpi = (label: string, value: string, cls = '') =>
    `<div class="kpi"><div class="kpi-label">${label}</div><div class="kpi-value ${cls}">${value}</div></div>`;
  return `
    <header class="cover">
      <div class="cover-top">
        <div class="wordmark">
          ${logo(52)}
          <div>
            <div class="wm-smart">Smart</div>
            <div class="wm-finance">Finance</div>
          </div>
        </div>
        <div class="tagline">FINANZAS DE ALTURA</div>
      </div>
      <div class="cover-main">
        <div>
          <div class="eyebrow">Informe financiero mensual</div>
          <h1>${escapeHtml(capitalize(d.periodLabel))}</h1>
          <div class="cover-sub">Preparado para <strong>${escapeHtml(d.profileName)}</strong> · ${longDate(d.generatedAt)}</div>
        </div>
        <div class="cover-moni">${mascotSvg('saludando', { size: 128, tone: 'light' })}</div>
      </div>
      <div class="kpis">
        ${kpi('Ingresos', formatCurrency(d.income), 'kpi-income')}
        ${kpi('Gastos', formatCurrency(d.expense), 'kpi-expense')}
        ${kpi('Ahorro neto', formatCurrency(d.net))}
        ${kpi('Tasa de ahorro', savings)}
        ${kpi('Patrimonio', formatCurrency(d.netWorth))}
      </div>
    </header>`;
}

function insights(d: MonthlyReportData): string {
  if (d.insights.length === 0) return '';
  const items = d.insights
    .map((i) => {
      const t = TONE[i.tone];
      return `<li class="insight" style="background:${t.bg}">
        <span class="insight-tag" style="color:${t.dot}"><span class="dot" style="background:${t.dot}"></span>${t.label}</span>
        <div class="insight-title">${escapeHtml(i.title)}</div>
        <div class="insight-body">${escapeHtml(i.body)}</div>
      </li>`;
    })
    .join('');
  return section(
    'Lo más importante del mes',
    'Moni revisó tus números y esto es lo que deberías saber.',
    `<div class="insights-wrap"><ul class="insights">${items}</ul>
      <div class="insights-moni">${mascotSvg('senalando', { size: 150 })}</div></div>`,
  );
}

function comparison(d: MonthlyReportData): string {
  const change = d.expenseChange;
  const changeText = change === null
    ? 'Sin datos del mes anterior'
    : `${change > 0 ? '+' : ''}${Math.round(change)}% vs. mes anterior`;
  const changeColor = change === null ? brand.inkSoft : change > 0 ? brand.expenseText : brand.incomeText;

  const p = d.prediction;
  const prediction = p
    ? `<div class="card">
        <div class="card-title">Predicción del mes <span class="muted right">Día ${p.dayOfMonth} de ${p.daysInMonth}</span></div>
        <p class="muted">Si sigues a este ritmo, terminarías gastando</p>
        <div class="big expense">${formatCurrency(p.projected)}</div>
        <div class="pair">
          <div><div class="muted small">Presupuesto</div><strong>${p.budgetLimit ? formatCurrency(p.budgetLimit) : 'Sin definir'}</strong></div>
          <div><div class="muted small">Tu promedio (3 meses)</div><strong>${p.historicalAverage ? formatCurrency(p.historicalAverage) : '—'}</strong></div>
        </div>
      </div>`
    : '';

  return section('Comparativa y proyección', '', `
    <div class="grid-2">
      <div class="card">
        <div class="card-title">Comparativa mensual</div>
        <div class="pair">
          <div><div class="muted small">Mes anterior</div><div class="mid">${formatCurrency(d.previousExpense)}</div></div>
          <div><div class="muted small">Este mes</div><div class="mid">${formatCurrency(d.expense)}</div></div>
        </div>
        <div class="pill" style="color:${changeColor}">${changeText}</div>
      </div>
      ${prediction}
    </div>`);
}

function categories(d: MonthlyReportData): string {
  if (d.categories.length === 0) {
    return section('¿En qué se fue tu dinero?', '', empty('Aún no hay gastos registrados este mes.'));
  }
  const rows = d.categories
    .map((c) => `<tr>
        <td>${swatch(c.color)}${escapeHtml(c.name)}</td>
        <td class="w-bar">${bar(c.percentage, safeColor(c.color))}</td>
        <td class="num muted">${pct(c.percentage)}</td>
        <td class="num strong">${formatCurrency(c.total)}</td>
      </tr>`)
    .join('');
  return section('¿En qué se fue tu dinero?', `${d.categories.length} categorías con gasto este mes.`, `
    <div class="card cat-wrap">
      <div class="donut">${donutSvg(d.categories, d.expense)}</div>
      <table class="table"><tbody>${rows}</tbody></table>
    </div>`);
}

function trend(d: MonthlyReportData): string {
  return section('Tendencia de 6 meses', 'Ingresos frente a gastos, mes a mes.', `
    <div class="card">
      <div class="legend">
        <span>${swatch(brand.incomeBar)}Ingresos</span>
        <span>${swatch(brand.expenseBar)}Gastos</span>
      </div>
      ${trendSvg(d.trend)}
    </div>`);
}

function budget(d: MonthlyReportData): string {
  const b = d.budget;
  if (!b) {
    return section('Presupuesto', '', empty('No definiste un presupuesto para este mes. Créalo en Más → Presupuestos.'));
  }
  const s = STATUS[b.status];
  const rows = b.rows
    .map((r) => {
      const rs = STATUS[r.status];
      return `<tr>
        <td>${swatch(r.color)}${escapeHtml(r.categoryName)}</td>
        <td class="w-bar">${bar(r.percent, rs.bar)}</td>
        <td class="num" style="color:${rs.text}">${pct(r.percent)}</td>
        <td class="num muted">${formatCurrency(r.spent)} / ${formatCurrency(r.limit)}</td>
      </tr>`;
    })
    .join('');
  return section('Presupuesto', '', `
    <div class="card">
      <div class="card-title">Total del mes <span class="right" style="color:${s.text}">${s.label}</span></div>
      <div class="pair">
        <div class="mid">${formatCurrency(b.spent)} <span class="muted small">de ${formatCurrency(b.totalLimit)}</span></div>
        <div class="mid" style="color:${s.text}">${pct(b.percent)}</div>
      </div>
      ${bar(b.percent, s.bar)}
      ${rows ? `<table class="table mt"><tbody>${rows}</tbody></table>` : ''}
    </div>`);
}

function goals(d: MonthlyReportData): string {
  if (d.goals.length === 0) return '';
  const rows = d.goals
    .map((g) => `<div class="goal">
        <div class="goal-head"><strong>${escapeHtml(g.name)}</strong><span class="muted small">Meta: ${longDate(g.targetDate)}</span></div>
        ${bar(g.percent, safeColor(g.color, brand.violet))}
        <div class="goal-foot muted small"><span>${formatCurrency(g.current)} de ${formatCurrency(g.target)}</span><span>${pct(g.percent)}</span></div>
      </div>`)
    .join('');
  return section('Metas de ahorro', `${d.goals.length} ${d.goals.length === 1 ? 'meta activa' : 'metas activas'}.`, `<div class="card">${rows}</div>`);
}

function subscriptions(d: MonthlyReportData): string {
  if (d.subscriptions.length === 0) return '';
  const rows = d.subscriptions
    .map((s) => `<tr>
        <td>${swatch(s.color)}${escapeHtml(s.name)}</td>
        <td class="muted">${s.frequencyLabel}</td>
        <td class="muted">Próximo cobro ${shortDate(s.nextBillingDate)}</td>
        <td class="num strong">${formatCurrency(s.amount)}</td>
      </tr>`)
    .join('');
  return section('Suscripciones', `Equivalen a ${formatCurrency(d.subscriptionsMonthly)} al mes.`, `
    <div class="card"><table class="table"><tbody>${rows}</tbody></table></div>`);
}

function accounts(d: MonthlyReportData): string {
  const rows = d.accounts
    .map((a) => `<tr>
        <td>${swatch(a.color)}${escapeHtml(a.name)}</td>
        <td class="muted">${a.typeLabel} · ${escapeHtml(a.currency)}</td>
        <td class="num strong">${escapeHtml(formatWithCurrency(a.balance, a.currency))}</td>
      </tr>`)
    .join('');
  const debts = d.debts.openCount > 0
    ? `<div class="pair mt">
        <div><div class="muted small">Te deben</div><div class="mid income">${formatCurrency(d.debts.owedToMe)}</div></div>
        <div><div class="muted small">Debes</div><div class="mid expense">${formatCurrency(d.debts.iOwe)}</div></div>
      </div>`
    : '';
  return section('Cuentas y patrimonio', `Patrimonio total: ${formatCurrency(d.netWorth)} (convertido a COP).`, `
    <div class="card">
      ${rows ? `<table class="table"><tbody>${rows}</tbody></table>` : '<p class="muted">Sin cuentas registradas.</p>'}
      ${debts}
    </div>`);
}

function topExpenses(d: MonthlyReportData): string {
  if (d.topExpenses.length === 0) return '';
  const rows = d.topExpenses
    .map((t) => `<tr>
        <td class="muted">${shortDate(t.date)}</td>
        <td>${swatch(t.color)}${escapeHtml(t.description)}</td>
        <td class="muted">${escapeHtml(t.categoryName)}</td>
        <td class="num strong expense">${formatCurrency(t.amount)}</td>
      </tr>`)
    .join('');
  return section('Tus gastos más grandes', '', `<div class="card"><table class="table"><tbody>${rows}</tbody></table></div>`);
}

function empty(text: string): string {
  return `<div class="card empty">${mascotSvg('descansando', { size: 84 })}<p class="muted">${escapeHtml(text)}</p></div>`;
}

function footer(d: MonthlyReportData): string {
  return `
    <footer class="footer">
      <div class="footer-brand">${logo(28)}<span><strong>Smart Finance</strong> · Finanzas de altura</span></div>
      <p>Generado el ${longDate(d.generatedAt)} con los datos guardados en tu dispositivo.
        Este informe es una guía para organizar tus finanzas, no una asesoría financiera.</p>
    </footer>`;
}

// ─── Estilos ────────────────────────────────────────────────

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
  @page { margin: 28px 0; }
  @page :first { margin-top: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #FFFFFF; }
  body { font-family: 'Outfit', -apple-system, 'Helvetica Neue', Roboto, Arial, sans-serif; color: ${brand.ink}; font-size: 12px; line-height: 1.45; }
  h1, h2 { margin: 0; letter-spacing: -0.02em; }
  p { margin: 0; }
  .muted { color: ${brand.inkSoft}; }
  .small { font-size: 10.5px; }
  .strong { font-weight: 700; }
  .right { float: right; font-weight: 500; font-size: 11px; }
  .mt { margin-top: 12px; }
  .income { color: ${brand.incomeText}; }
  .expense { color: ${brand.expenseText}; }

  .cover { background: linear-gradient(135deg, ${brand.night} 0%, ${brand.indigo} 62%, ${brand.violet} 100%); color: #FFFFFF; padding: 32px 36px 26px; }
  .cover-top { display: flex; justify-content: space-between; align-items: center; }
  .wordmark { display: flex; align-items: center; gap: 10px; }
  .wm-smart { color: ${brand.lavender}; font-weight: 500; font-size: 22px; line-height: 1; }
  .wm-finance { color: ${brand.peach}; font-weight: 800; font-size: 22px; line-height: 1.05; letter-spacing: -0.02em; }
  .tagline { color: ${brand.lavender}; font-size: 9.5px; letter-spacing: 4px; font-weight: 500; }
  .cover-main { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 26px; }
  .eyebrow { color: ${brand.lavender}; text-transform: uppercase; letter-spacing: 1.6px; font-size: 10.5px; font-weight: 600; }
  .cover h1 { font-size: 40px; font-weight: 800; margin-top: 4px; }
  .cover-sub { color: rgba(255,255,255,0.78); margin-top: 6px; font-size: 12px; }
  .cover-sub strong { color: #FFFFFF; }
  .cover-moni { margin-bottom: -8px; }
  .kpis { display: flex; gap: 8px; margin-top: 18px; }
  .kpi { flex: 1; background: rgba(255,255,255,0.09); border: 1px solid rgba(255,255,255,0.14); border-radius: 14px; padding: 10px 12px; }
  .kpi-label { color: rgba(255,255,255,0.72); font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; }
  .kpi-value { font-weight: 800; font-size: 16px; margin-top: 2px; white-space: nowrap; }
  .kpi-income { color: #A9D65F; }
  .kpi-expense { color: #E58AEB; }

  main { padding: 6px 36px 0; }
  .section { margin-top: 22px; break-inside: avoid; page-break-inside: avoid; }
  .section-head { margin-bottom: 10px; border-left: 4px solid ${brand.peach}; padding-left: 10px; }
  .section h2 { font-size: 17px; font-weight: 700; }
  .card { background: ${brand.paper}; border-radius: 16px; padding: 14px 16px; break-inside: avoid; }
  .card-title { font-weight: 700; font-size: 13px; margin-bottom: 8px; }
  .grid-2 { display: flex; gap: 12px; }
  .grid-2 > .card { flex: 1; }
  .pair { display: flex; justify-content: space-between; gap: 12px; margin-top: 6px; }
  .mid { font-size: 18px; font-weight: 700; }
  .big { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; margin: 2px 0 6px; }
  .pill { margin-top: 12px; background: ${brand.card}; border-radius: 999px; padding: 7px 12px; font-weight: 600; display: inline-block; }

  .insights-wrap { display: flex; gap: 12px; align-items: center; }
  .insights { list-style: none; margin: 0; padding: 0; flex: 1; display: flex; flex-direction: column; gap: 8px; }
  .insight { border-radius: 14px; padding: 10px 14px; color: ${brand.ink}; }
  .insight-tag { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; }
  .insight-title { font-weight: 700; font-size: 13px; margin-top: 2px; }
  .insight-body { color: ${brand.inkSoft}; }
  .insights-moni { width: 150px; flex-shrink: 0; }
  .dot { display: inline-block; width: 7px; height: 7px; border-radius: 4px; margin-right: 6px; vertical-align: 1px; }

  .cat-wrap { display: flex; gap: 18px; align-items: center; }
  .donut { flex-shrink: 0; }
  .cat-wrap .table { flex: 1; }
  .table { width: 100%; border-collapse: collapse; }
  .table td { padding: 7px 4px; border-bottom: 1px solid ${brand.border}; vertical-align: middle; }
  .table tr:last-child td { border-bottom: none; }
  .num { text-align: right; white-space: nowrap; }
  .w-bar { width: 32%; }
  .swatch { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 8px; vertical-align: -1px; border: 1px solid rgba(42,27,107,0.12); }
  .bar { height: 8px; background: rgba(42,27,107,0.08); border-radius: 999px; overflow: hidden; }
  .bar span { display: block; height: 100%; border-radius: 999px; }
  .legend { display: flex; gap: 16px; margin-bottom: 6px; color: ${brand.inkSoft}; }

  .goal + .goal { margin-top: 12px; }
  .goal-head, .goal-foot { display: flex; justify-content: space-between; margin: 3px 0; }

  .empty { display: flex; align-items: center; gap: 12px; }

  .svg-big { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800; fill: ${brand.ink}; }
  .svg-small { font-family: 'Outfit', sans-serif; font-size: 11px; fill: ${brand.inkSoft}; }
  .svg-axis { font-family: 'Outfit', sans-serif; font-size: 10px; fill: ${brand.inkMuted}; }
  .svg-label { font-family: 'Outfit', sans-serif; font-size: 12px; fill: ${brand.inkSoft}; text-transform: capitalize; }
  .svg-label-strong { font-weight: 700; fill: ${brand.ink}; }

  .footer { margin: 26px 36px 0; padding: 14px 18px; border-radius: 16px; background: ${brand.night}; color: rgba(255,255,255,0.78); font-size: 10.5px; break-inside: avoid; }
  .footer-brand { display: flex; align-items: center; gap: 8px; color: #FFFFFF; margin-bottom: 6px; font-size: 12px; }
`;

/** Documento HTML completo del informe. */
export function buildReportHtml(d: MonthlyReportData): string {
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Informe Smart Finance · ${escapeHtml(d.periodLabel)}</title>
    <style>${STYLES}</style>
  </head>
  <body>
    ${cover(d)}
    <main>
      ${insights(d)}
      ${comparison(d)}
      ${categories(d)}
      ${trend(d)}
      ${budget(d)}
      ${goals(d)}
      ${subscriptions(d)}
      ${accounts(d)}
      ${topExpenses(d)}
    </main>
    ${footer(d)}
  </body>
</html>`;
}
