import type { AccountType } from '../models/types';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking:   'Cuenta corriente',
  savings:    'Ahorros',
  cash:       'Efectivo',
  digital:    'Billetera digital',
  investment: 'Inversiones',
  credit:     'Tarjeta crédito',
};

/** Aclaración corta junto al saldo: qué significa ese número según el tipo. */
export function balanceHint(type: AccountType): string {
  if (type === 'credit') return 'Por pagar';
  if (type === 'investment') return 'Invertido';
  return 'Disponible';
}
