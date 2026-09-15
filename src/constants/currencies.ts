export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'COP', symbol: '$',   name: 'Peso colombiano' },
  { code: 'USD', symbol: 'US$', name: 'Dólar estadounidense' },
  { code: 'EUR', symbol: '€',   name: 'Euro' },
];

export function getCurrencyInfo(code: string): CurrencyInfo {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code) ?? SUPPORTED_CURRENCIES[0];
}

// Formatea un monto con el símbolo de su propia moneda (sin conversión)
export function formatWithCurrency(amount: number, currencyCode: string): string {
  const { symbol } = getCurrencyInfo(currencyCode);
  return `${symbol}${Math.round(amount).toLocaleString('es-CO')}`;
}
