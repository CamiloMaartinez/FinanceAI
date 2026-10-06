import { pastels } from './theme';
import type { AppIconName } from '../components/icons/iconSet';

export interface AccountColorOption {
  id: string;
  label: string;
  colorHex: string;
  /** Segundo color del degradado; null = sólido. */
  gradientTo: string | null;
}

// 17 opciones: los 8 pastels, 5 tonos profundos y 4 degradados.
export const ACCOUNT_COLOR_OPTIONS: AccountColorOption[] = [
  { id: 'peach',    label: 'Durazno',  colorHex: pastels.peach,    gradientTo: null },
  { id: 'lavender', label: 'Lavanda',  colorHex: pastels.lavender, gradientTo: null },
  { id: 'mint',     label: 'Menta',    colorHex: pastels.mint,     gradientTo: null },
  { id: 'pink',     label: 'Rosa',     colorHex: pastels.pink,     gradientTo: null },
  { id: 'sky',      label: 'Celeste',  colorHex: pastels.sky,      gradientTo: null },
  { id: 'yellow',   label: 'Amarillo', colorHex: pastels.yellow,   gradientTo: null },
  { id: 'lilac',    label: 'Lila',     colorHex: pastels.lilac,    gradientTo: null },
  { id: 'coral',    label: 'Coral',    colorHex: pastels.coral,    gradientTo: null },
  { id: 'purple',   label: 'Morado',      colorHex: '#4B2BA8', gradientTo: null },
  { id: 'indigo',   label: 'Índigo',      colorHex: '#2E3192', gradientTo: null },
  { id: 'night',    label: 'Azul noche',  colorHex: '#1B2A4A', gradientTo: null },
  { id: 'forest',   label: 'Verde bosque', colorHex: '#1F5A3D', gradientTo: null },
  { id: 'wine',     label: 'Vino',        colorHex: '#6E1F3A', gradientTo: null },
  { id: 'lav-pink',    label: 'Lavanda a rosa',   colorHex: pastels.lavender, gradientTo: pastels.pink },
  { id: 'peach-pink',  label: 'Durazno a rosa',   colorHex: pastels.peach,    gradientTo: pastels.pink },
  { id: 'mint-sky',    label: 'Menta a celeste',  colorHex: pastels.mint,     gradientTo: pastels.sky },
  { id: 'purple-indigo', label: 'Morado a índigo', colorHex: '#6B3FC9',       gradientTo: '#2E3192' },
];

/** Ícono sugerido según el tipo y la moneda de la cuenta. */
export function suggestAccountIcon(type: string, currency: string): AppIconName {
  switch (type) {
    case 'credit':     return 'tarjeta';
    case 'investment': return 'inversiones';
    case 'savings':    return 'ahorro';
    case 'checking':   return 'banco';
    case 'digital':    return 'billetera';
    default:           return currency === 'USD' ? 'dolar' : currency === 'EUR' ? 'euro' : 'peso';
  }
}

/** Ícono de la moneda (peso, dólar o euro). */
export function currencyIcon(currency: string): AppIconName {
  return currency === 'USD' ? 'dolar' : currency === 'EUR' ? 'euro' : 'peso';
}
