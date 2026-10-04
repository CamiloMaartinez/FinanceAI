import { advanceDueSubscriptions } from '../database/db';
import { cancelSubscriptionReminders, scheduleSubscriptionReminders } from './notifications';

// Pasa al siguiente cobro las suscripciones cuya fecha ya quedó atrás y les
// programa los recordatorios (7, 3 y 1 día antes) del nuevo cobro. Sin
// esto, la fecha se quedaba en el pasado, la suscripción salía "urgente"
// para siempre y no volvía a avisar.
export async function refreshSubscriptionBilling(now: Date = new Date()): Promise<number> {
  const advanced = await advanceDueSubscriptions(now);
  for (const sub of advanced) {
    try {
      await cancelSubscriptionReminders(sub.id);
      await scheduleSubscriptionReminders(sub.id, sub.name, sub.amount, sub.nextBillingDate);
    } catch {
      // Un recordatorio que falla no debe impedir avanzar las demás
    }
  }
  return advanced.length;
}
