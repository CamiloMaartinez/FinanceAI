import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configura cómo se comportan las notificaciones cuando la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Pide permiso al usuario — debe llamarse antes de programar cualquier notificación
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

// Programa las 3 notificaciones de una suscripción: 7, 3 y 1 día antes
export async function scheduleSubscriptionReminders(
  subscriptionId: string,
  name: string,
  amount: number,
  nextBillingDate: string
): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const billingDate = new Date(nextBillingDate);
  const reminders = [
    { daysBefore: 7, label: '7 días' },
    { daysBefore: 3, label: '3 días' },
    { daysBefore: 1, label: '1 día' },
  ];

  for (const reminder of reminders) {
    const triggerDate = new Date(billingDate);
    triggerDate.setDate(triggerDate.getDate() - reminder.daysBefore);
    triggerDate.setHours(9, 0, 0, 0); // 9:00 AM

    // Solo programar si la fecha es en el futuro
    if (triggerDate.getTime() <= Date.now()) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: `${subscriptionId}-${reminder.daysBefore}`,
      content: {
        title: `${name} se cobra en ${reminder.label}`,
        body: `Se cobrarán $${amount.toLocaleString('es-CO')} a tu cuenta`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  }
}

// Cancela todas las notificaciones programadas de una suscripción
export async function cancelSubscriptionReminders(subscriptionId: string): Promise<void> {
  const ids = [7, 3, 1].map((d) => `${subscriptionId}-${d}`);
  for (const id of ids) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}