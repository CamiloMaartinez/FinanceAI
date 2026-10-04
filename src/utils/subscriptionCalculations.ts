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
function addMonthsClamped(from: Date, months: number): Date {
  const date = new Date(from);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return date;
}

// Calcula la siguiente fecha de cobro, avanzando un período desde una fecha base
export function calculateNextBillingDate(
  frequency: BillingFrequency,
  fromDate: Date = new Date()
): string {
  let date = new Date(fromDate);

  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date = addMonthsClamped(date, 1);
      break;
    case 'quarterly':
      date = addMonthsClamped(date, 3);
      break;
    case 'annual':
      date = addMonthsClamped(date, 12);
      break;
  }

  return date.toISOString();
}