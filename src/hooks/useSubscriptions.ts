import { useState, useCallback, useEffect } from 'react';
import {
  getAllSubscriptions,
  createSubscription,
  deleteSubscription,
} from '../database/db';
import { scheduleSubscriptionReminders, cancelSubscriptionReminders } from '../services/notifications';
import type { Subscription } from '../models/types';

interface UseSubscriptionsResult {
  subscriptions: Subscription[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addSubscription: (
    name: string,
    amount: number,
    frequency: string,
    nextBillingDate: string,
    colorHex: string,
    iconName: string
  ) => Promise<void>;
  removeSubscription: (subscription: Subscription) => Promise<void>;
}

export function useSubscriptions(): UseSubscriptionsResult {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await getAllSubscriptions();
      setSubscriptions(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando suscripciones');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addSubscription = useCallback(async (
    name: string,
    amount: number,
    frequency: string,
    nextBillingDate: string,
    colorHex: string,
    iconName: string
  ) => {
    const id = await createSubscription(name, amount, frequency, nextBillingDate, colorHex, iconName);
    // Programar notificaciones para esta suscripción
    await scheduleSubscriptionReminders(id, name, amount, nextBillingDate);
    await load();
  }, [load]);

  const removeSubscription = useCallback(async (subscription: Subscription) => {
    await deleteSubscription(subscription.id);
    await cancelSubscriptionReminders(subscription.id);
    await load();
  }, [load]);

  return {
    subscriptions,
    isLoading,
    error,
    refresh: load,
    addSubscription,
    removeSubscription,
  };
}