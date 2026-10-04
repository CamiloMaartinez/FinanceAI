import * as Notifications from 'expo-notifications';
import { requestNotificationPermission } from './notifications';
import type { Debt } from '../models/types';

// Recordatorios locales de una deuda con fecha límite: el día antes y el
// mismo día, a las 9:00.
const REMINDERS = [
  { daysBefore: 1, suffix: '1' },
  { daysBefore: 0, suffix: '0' },
];

const reminderId = (debtId: string, suffix: string) => `debt-${debtId}-${suffix}`;

export async function scheduleDebtReminders(
  debt: Pick<Debt, 'id' | 'direction' | 'personName' | 'dueDate'> & { remaining: number }
): Promise<void> {
  await cancelDebtReminders(debt.id);
  if (!debt.dueDate || debt.remaining <= 0) return;
  if (!(await requestNotificationPermission())) return;

  const amount = `$${Math.round(debt.remaining).toLocaleString('es-CO')}`;
  for (const { daysBefore, suffix } of REMINDERS) {
    const trigger = new Date(debt.dueDate);
    trigger.setDate(trigger.getDate() - daysBefore);
    trigger.setHours(9, 0, 0, 0);
    if (trigger.getTime() <= Date.now()) continue;

    const when = daysBefore === 0 ? 'hoy' : 'mañana';
    await Notifications.scheduleNotificationAsync({
      identifier: reminderId(debt.id, suffix),
      content: debt.direction === 'i_owe'
        ? { title: `Vence ${when}: le debes a ${debt.personName}`, body: `Te falta pagar ${amount}` }
        : { title: `Vence ${when}: ${debt.personName} te debe`, body: `Le falta pagarte ${amount}` },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
    });
  }
}

export async function cancelDebtReminders(debtId: string): Promise<void> {
  for (const { suffix } of REMINDERS) {
    await Notifications.cancelScheduledNotificationAsync(reminderId(debtId, suffix));
  }
}
