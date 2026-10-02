import type { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../../utils/currency';
import { formatWithCurrency } from '../../constants/currencies';
import type { Account, AccountType } from '../../models/types';

// ─── Tipografía ─────────────────────────────────────────────
// Números: pesos gruesos y dígitos tabulares (no "bailan" al cambiar).
// Metadatos: peso regular, en gris. Sistema sans-serif (SF Pro / Roboto).
export const walletType = {
  totalAmount: { fontSize: 44, fontWeight: '800' as const, letterSpacing: -1.5, fontVariant: ['tabular-nums' as const] },
  cardAmount:  { fontSize: 34, fontWeight: '800' as const, letterSpacing: -1,   fontVariant: ['tabular-nums' as const] },
  stripAmount: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.3, fontVariant: ['tabular-nums' as const] },
  cardName:    { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.2 },
  meta:        { fontSize: 12, fontWeight: '400' as const, letterSpacing: 0.1 },
  eyebrow:     { fontSize: 11, fontWeight: '500' as const, letterSpacing: 1.1 },
};

// ─── Metadatos de cuenta ────────────────────────────────────
type IconName = keyof typeof Ionicons.glyphMap;

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking:   'Cuenta corriente',
  savings:    'Ahorros',
  cash:       'Efectivo',
  digital:    'Billetera digital',
  investment: 'Inversiones',
  credit:     'Crédito',
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, IconName> = {
  checking:   'business-outline',
  savings:    'trending-up-outline',
  cash:       'cash-outline',
  digital:    'phone-portrait-outline',
  investment: 'stats-chart-outline',
  credit:     'card-outline',
};

export function formatAccountBalance(account: Pick<Account, 'balance' | 'currency'>): string {
  return account.currency && account.currency !== 'COP'
    ? formatWithCurrency(account.balance, account.currency)
    : formatCurrency(account.balance);
}

export function formatMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });
}

export const HIDDEN_AMOUNT = '••••••';

// ─── Paleta de tarjeta derivada del color de la cuenta ──────
type RGB = readonly [number, number, number];

export interface CardPalette {
  gradient: readonly [string, string, string];
  sheen: readonly [string, string];
  /** Texto principal: blanco o casi-negro, el que dé mejor contraste (WCAG). */
  fg: string;
  fgMuted: string;
  /** Fondo de "píldoras" de cristal sobre la tarjeta. */
  chip: string;
  hairline: string;
}

function parseHex(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toCss = ([r, g, b]: RGB) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function relativeLuminance([r, g, b]: RGB): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];

export function getCardPalette(colorHex: string | null | undefined, fallbackHex: string): CardPalette {
  const base = parseHex(colorHex ?? '') ?? parseHex(fallbackHex) ?? [10, 132, 255];
  const mid = mix(base, BLACK, 0.12);
  const L = relativeLuminance(mid);
  const useDarkText = (L + 0.05) / 0.05 > 1.05 / (L + 0.05); // contraste vs negro > vs blanco

  return {
    gradient: [toCss(mix(base, WHITE, 0.12)), toCss(mid), toCss(mix(base, BLACK, 0.34))],
    sheen: ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)'],
    fg:       useDarkText ? '#0A0A0A' : '#FFFFFF',
    fgMuted:  useDarkText ? 'rgba(10,10,10,0.62)' : 'rgba(255,255,255,0.74)',
    chip:     useDarkText ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.20)',
    hairline: useDarkText ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.22)',
  };
}
