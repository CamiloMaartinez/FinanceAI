import { useState, useCallback, useEffect } from 'react';
import {
  getAllChallenges,
  createChallenge,
  updateChallengeStatus,
  deleteChallenge,
  getCategorySpentInRange,
} from '../database/db';
import type { Challenge } from '../models/types';

export interface ChallengeProgress extends Challenge {
  spentSoFar: number;
  daysLeft: number;
  daysTotal: number;
}

interface UseChallengesResult {
  challenges: ChallengeProgress[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addChallenge: (
    title: string,
    description: string,
    categoryId: string,
    days: number
  ) => Promise<void>;
  removeChallenge: (id: string) => Promise<void>;
}

const DAY_MS = 1000 * 60 * 60 * 24;

export function useChallenges(): UseChallengesResult {
  const [challenges, setChallenges] = useState<ChallengeProgress[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await getAllChallenges();
      const now = new Date();

      const withProgress: ChallengeProgress[] = [];

      for (const ch of rows) {
        const start = new Date(ch.startDate);
        const end = new Date(ch.endDate);
        const spentSoFar = await getCategorySpentInRange(ch.categoryId, ch.startDate, ch.endDate);
        const daysTotal = Math.max(Math.round((end.getTime() - start.getTime()) / DAY_MS), 1);
        const daysLeft = Math.max(Math.ceil((end.getTime() - now.getTime()) / DAY_MS), 0);

        let status = ch.status;

        // Reevaluamos el estado en cada carga: si gastó algo en la
        // categoría, el reto se rompe de inmediato. Si llegó la fecha
        // final sin gastar nada, se completó con éxito.
        if (status === 'active') {
          if (spentSoFar > 0) {
            status = 'failed';
            await updateChallengeStatus(ch.id, 'failed');
          } else if (now >= end) {
            status = 'completed';
            await updateChallengeStatus(ch.id, 'completed');
          }
        }

        withProgress.push({ ...ch, status, spentSoFar, daysLeft, daysTotal });
      }

      setChallenges(withProgress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando retos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addChallenge = useCallback(async (
    title: string,
    description: string,
    categoryId: string,
    days: number
  ) => {
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + days);

    await createChallenge(title, description, categoryId, start.toISOString(), end.toISOString());
    await load();
  }, [load]);

  const removeChallenge = useCallback(async (id: string) => {
    await deleteChallenge(id);
    await load();
  }, [load]);

  return { challenges, isLoading, error, refresh: load, addChallenge, removeChallenge };
}
