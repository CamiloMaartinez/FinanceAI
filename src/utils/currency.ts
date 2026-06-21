// Convierte 3500000 → "$3.500.000"
export function formatCurrency(value: number): string {
  const rounded = Math.round(value);
  return '$' + rounded.toLocaleString('es-CO');
}

// Convierte 3500000 → "$3.5M" | 150000 → "$150K"
export function formatCurrencyCompact(value: number): string {
  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    return '$' + (value / 1_000_000).toFixed(1) + 'M';
  }
  if (abs >= 1_000) {
    return '$' + (value / 1_000).toFixed(0) + 'K';
  }
  return formatCurrency(value);
}

// Convierte "2024-01-15T10:30:00.000Z" → "15 ene"
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
  });
}

// Devuelve "Buenos días" / "Buenas tardes" / "Buenas noches"
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}