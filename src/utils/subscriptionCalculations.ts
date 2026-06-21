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

// Calcula la siguiente fecha de cobro, avanzando un período desde una fecha base
export function calculateNextBillingDate(
  frequency: BillingFrequency,
  fromDate: Date = new Date()
): string {
  const date = new Date(fromDate);

  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'annual':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date.toISOString();
}