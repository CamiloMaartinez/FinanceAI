// Convierte el monto que llega desde un atajo de Siri / Apple Pay en un
// número. Según el idioma del iPhone puede venir como "$25.000",
// "25.000,50", "25,000.50", "COP 25000" o "25000".
export function parseShortcutAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  let normalized: string;

  if (lastDot !== -1 && lastComma !== -1) {
    // Hay ambos: el que aparece de último es el separador decimal
    const decimalSep = lastDot > lastComma ? '.' : ',';
    const thousandsSep = decimalSep === '.' ? ',' : '.';
    normalized = cleaned.split(thousandsSep).join('').replace(decimalSep, '.');
  } else if (lastDot !== -1 || lastComma !== -1) {
    // Solo uno: si va seguido de exactamente 3 dígitos es de miles ("25.000")
    const sep = lastDot !== -1 ? '.' : ',';
    const parts = cleaned.split(sep);
    const isThousands = parts.length > 2 || parts[parts.length - 1].length === 3;
    normalized = isThousands ? parts.join('') : parts.join('.');
  } else {
    normalized = cleaned;
  }

  const value = parseFloat(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}
