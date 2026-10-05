import AsyncStorage from '@react-native-async-storage/async-storage';

const RATES_KEY = 'exchange-rates';
const META_KEY = 'exchange-rates-meta';

// Fuente gratuita y sin API key. Sus condiciones piden mostrar la
// atribución (ver ExchangeRatesModal) y no consultar más de una vez por
// hora; las tasas cambian una vez al día, así que con 12 horas basta.
export const RATES_API_URL = 'https://open.er-api.com/v6/latest/USD';
export const RATES_ATTRIBUTION_URL = 'https://www.exchangerate-api.com';
const REFRESH_EVERY_MS = 12 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

// Monedas que la app convierte a pesos colombianos
export const FOREIGN_CURRENCIES = ['USD', 'EUR'] as const;

// Tasas de respaldo (cuántos pesos vale 1 unidad de esa moneda) para la
// primera vez que se abre la app sin internet.
const DEFAULT_RATES: Record<string, number> = {
  USD: 4000,
  EUR: 4300,
};

export interface ExchangeRatesMeta {
  // true: se actualizan solas desde internet. false: el usuario las
  // escribió a mano y no se sobrescriben.
  auto: boolean;
  updatedAt: string | null; // última actualización automática exitosa
}

const DEFAULT_META: ExchangeRatesMeta = { auto: true, updatedAt: null };

export async function getExchangeRates(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(RATES_KEY);
    if (!raw) return { ...DEFAULT_RATES };
    return { ...DEFAULT_RATES, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_RATES };
  }
}

export async function getExchangeRatesMeta(): Promise<ExchangeRatesMeta> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    return raw ? { ...DEFAULT_META, ...JSON.parse(raw) } : { ...DEFAULT_META };
  } catch {
    return { ...DEFAULT_META };
  }
}

async function saveMeta(meta: ExchangeRatesMeta): Promise<void> {
  await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
}

export async function setAutoExchangeRates(auto: boolean): Promise<void> {
  await saveMeta({ ...(await getExchangeRatesMeta()), auto });
}

// Guarda una tasa escrita a mano. También se usa al restaurar un respaldo.
export async function setExchangeRate(currencyCode: string, rate: number): Promise<void> {
  const current = await getExchangeRates();
  current[currencyCode] = rate;
  await AsyncStorage.setItem(RATES_KEY, JSON.stringify(current));
}

// La API da cuántas unidades de cada moneda vale 1 USD. La app necesita
// cuántos pesos vale 1 unidad de cada moneda:
//   USD → COP = rates.COP
//   EUR → COP = rates.COP / rates.EUR
// Devuelve null si la respuesta no trae datos válidos.
export function ratesFromApiResponse(json: unknown): Record<string, number> | null {
  const data = json as { result?: string; rates?: Record<string, number> } | null;
  const rates = data?.rates;
  if (data?.result !== 'success' || !rates) return null;

  const copPerUsd = rates.COP;
  if (!(copPerUsd > 0)) return null;

  const result: Record<string, number> = {};
  for (const code of FOREIGN_CURRENCIES) {
    const perUsd = code === 'USD' ? 1 : rates[code];
    if (!(perUsd > 0)) return null;
    result[code] = copPerUsd / perUsd;
  }
  return result;
}

export type RefreshResult = 'updated' | 'skipped-manual' | 'skipped-recent' | 'failed';

// Actualiza las tasas desde internet si están en modo automático y tienen
// más de 12 horas (o siempre, con `force`). Si falla, se conservan las
// últimas tasas guardadas: la app nunca se queda sin tasas.
export async function refreshExchangeRates(
  { force = false, now = new Date() }: { force?: boolean; now?: Date } = {}
): Promise<RefreshResult> {
  const meta = await getExchangeRatesMeta();
  if (!meta.auto) return 'skipped-manual';
  if (!force && meta.updatedAt && now.getTime() - new Date(meta.updatedAt).getTime() < REFRESH_EVERY_MS) {
    return 'skipped-recent';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(RATES_API_URL, { signal: controller.signal });
    if (!response.ok) return 'failed';
    const rates = ratesFromApiResponse(await response.json());
    if (!rates) return 'failed';

    const current = await getExchangeRates();
    await AsyncStorage.setItem(RATES_KEY, JSON.stringify({ ...current, ...rates }));
    await saveMeta({ ...meta, updatedAt: now.toISOString() });
    return 'updated';
  } catch {
    return 'failed';
  } finally {
    clearTimeout(timeout);
  }
}

// Convierte un monto de cualquier moneda soportada a pesos colombianos
export function convertToCOP(amount: number, currencyCode: string, rates: Record<string, number>): number {
  if (currencyCode === 'COP') return amount;
  const rate = rates[currencyCode] ?? 1;
  return amount * rate;
}

// Convierte entre dos monedas cualesquiera pasando por pesos colombianos
// (1.000.000 COP → USD = 1.000.000 / 3.311,64). Redondeado a centavos.
export function convertBetween(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount;
  const cop = convertToCOP(amount, fromCurrency, rates);
  const result = toCurrency === 'COP' ? cop : cop / (rates[toCurrency] ?? 1);
  return Math.round(result * 100) / 100;
}
