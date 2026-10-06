// Lógica del teclado de montos: el texto crudo usa solo dígitos y una coma
// decimal ("1284,5"). Los puntos de miles se agregan al mostrarlo.

const MAX_INTEGER_DIGITS = 12;

export function applyAmountKey(raw: string, key: string, decimals: number): string {
  if (key === 'del') return raw.slice(0, -1);

  const [intPart, fracPart] = raw.split(',');
  if (key === ',') {
    if (decimals === 0 || raw.includes(',')) return raw;
    return (raw === '' ? '0' : raw) + ',';
  }
  if (!/^\d$/.test(key)) return raw;

  if (fracPart !== undefined) {
    return fracPart.length >= decimals ? raw : raw + key;
  }
  if (intPart.length >= MAX_INTEGER_DIGITS) return raw;
  // Sin ceros a la izquierda: "0" + "5" → "5"
  return intPart === '0' ? key : raw + key;
}

export function amountFromRaw(raw: string): number {
  if (!raw) return 0;
  const value = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
}

/** Monto → texto crudo, para editar uno que ya existe. */
export function rawFromAmount(value: number, decimals: number): string {
  if (!(value > 0)) return '';
  const fixed = decimals > 0 ? value.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '') : String(Math.round(value));
  return fixed.replace('.', ',');
}

/** Partes para pintar: entera con puntos de miles y la fracción (con coma) aparte. */
export function displayParts(raw: string): { integer: string; fraction: string } {
  const [intPart, fracPart] = raw.split(',');
  const integer = (intPart || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return { integer, fraction: fracPart !== undefined ? `,${fracPart}` : '' };
}

/** Formato que entiende el resto de formularios ("1.284,5"). */
export function formatAmountForInput(value: number): string {
  return value.toLocaleString('es-CO', { maximumFractionDigits: 2 });
}
