import type { Subscription, BillingFrequency } from '../models/types';

export function getAnnualCost(subscription: Subscription): number {
  switch (subscription.frequency) {
    case 'weekly':    return subscription.amount * 52;
    case 'monthly':   return subscription.amount * 12;
    case 'quarterly': return subscription.amount * 4;
    case 'annual':    return subscription.amount;
    default:          return subscription.amount * 12;
  }
}

export function getDaysUntilBilling(subscription: Subscription): number {
  const today = new Date();
  const billing = new Date(subscription.nextBillingDate);
  const diffMs = billing.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function isUrgent(subscription: Subscription): boolean {
  return getDaysUntilBilling(subscription) <= 3;
}

export function isUpcoming(subscription: Subscription): boolean {
  return getDaysUntilBilling(subscription) <= 7;
}

export function getTotalAnnualCost(subscriptions: Subscription[]): number {
  return subscriptions.reduce((sum, sub) => sum + getAnnualCost(sub), 0);
}

export function getTotalMonthlyCost(subscriptions: Subscription[]): number {
  return getTotalAnnualCost(subscriptions) / 12;
}
// Suma meses sin desbordar el día: setMonth(+1) sobre el 31 de enero da el
// "31 de febrero", que JavaScript convierte en 3 de marzo. Aquí se ajusta
// al último día del mes destino (31 ene → 28 feb; 29 feb + 12 → 28 feb).
// `anchorDay` es el día de cobro original: así, tras un 28 de febrero, el
// cobro vuelve al 31 en marzo en lugar de quedarse en 28.
function addMonthsClamped(from: Date, months: number, anchorDay?: number | null): Date {
  const date = new Date(from);
  const day = anchorDay ?? date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return date;
}

const PERIOD_MONTHS: Record<Exclude<BillingFrequency, 'weekly'>, number> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
};

function addPeriod(date: Date, frequency: BillingFrequency, anchorDay?: number | null): Date {
  if (frequency === 'weekly') {
    const next = new Date(date);
    next.setDate(next.getDate() + 7);
    return next;
  }
  return addMonthsClamped(date, PERIOD_MONTHS[frequency] ?? 1, anchorDay);
}

// Calcula la siguiente fecha de cobro, avanzando un período desde una fecha base
export function calculateNextBillingDate(
  frequency: BillingFrequency,
  fromDate: Date = new Date(),
  anchorDay?: number | null
): string {
  return addPeriod(new Date(fromDate), frequency, anchorDay).toISOString();
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// Si el día de cobro ya pasó, devuelve el siguiente cobro que todavía no
// ha ocurrido (saltando los períodos que se hayan perdido si la app no se
// abrió). El mismo día del cobro todavía no se avanza: se muestra "hoy".
// Devuelve null si no hay que cambiar nada.
export function advanceBillingDate(
  nextBillingDate: string,
  frequency: BillingFrequency,
  anchorDay: number | null,
  now: Date = new Date()
): string | null {
  let date = new Date(nextBillingDate);
  if (Number.isNaN(date.getTime()) || startOfDay(date) >= startOfDay(now)) return null;

  // Tope de seguridad: 10 años de cobros semanales
  for (let i = 0; i < 520 && startOfDay(date) < startOfDay(now); i++) {
    date = addPeriod(date, frequency, anchorDay);
  }
  return date.toISOString();
}
