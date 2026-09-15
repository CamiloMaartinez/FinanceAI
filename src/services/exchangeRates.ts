import AsyncStorage from '@react-native-async-storage/async-storage';

const RATES_KEY = 'exchange-rates';

// Tasas de referencia (cuántos pesos colombianos vale 1 unidad de esa
// moneda). Son valores de ejemplo — el usuario debe actualizarlas con la
// tasa real vigente desde Ajustes, ya que el mercado cambia todos los días
// y esta app no consulta una API de tipo de cambio en tiempo real.
const DEFAULT_RATES: Record<string, number> = {
  USD: 4000,
  EUR: 4300,
};

export async function getExchangeRates(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(RATES_KEY);
    if (!raw) return { ...DEFAULT_RATES };
    return { ...DEFAULT_RATES, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_RATES };
  }
}

export async function setExchangeRate(currencyCode: string, rate: number): Promise<void> {
  const current = await getExchangeRates();
  current[currencyCode] = rate;
  await AsyncStorage.setItem(RATES_KEY, JSON.stringify(current));
}

// Convierte un monto de cualquier moneda soportada a pesos colombianos
export function convertToCOP(amount: number, currencyCode: string, rates: Record<string, number>): number {
  if (currencyCode === 'COP') return amount;
  const rate = rates[currencyCode] ?? 1;
  return amount * rate;
}
