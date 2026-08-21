import { useState, useCallback, useEffect } from 'react';
import { getProfile, updateProfile, UserProfile } from '../services/profile';
import { getGlobalStats, getAverageMonthlySavings } from '../database/db';

export interface ProfileStats {
  totalTransactions: number;
  totalIncome: number;
  totalExpenses: number;
  averageMonthlySavings: number;
  completedGoals: number;
  activeGoals: number;
  daysUsing: number;
  savingsRate: number;
  healthScore: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

interface UseProfileResult {
  profile: UserProfile | null;
  stats: ProfileStats | null;
  achievements: Achievement[];
  isLoading: boolean;
  updateName: (name: string) => Promise<void>;
  toggleFaceId: (enabled: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

function calculateHealthScore(
  savingsRate: number,
  completedGoals: number,
  totalTransactions: number
): number {
  let score = 0;

  // Tasa de ahorro (hasta 50 puntos)
  if (savingsRate >= 20) score += 50;
  else if (savingsRate >= 10) score += 35;
  else if (savingsRate >= 5)  score += 20;
  else if (savingsRate > 0)   score += 10;

  // Metas completadas (hasta 30 puntos)
  score += Math.min(completedGoals * 10, 30);

  // Transacciones registradas — constancia (hasta 20 puntos)
  if (totalTransactions >= 50) score += 20;
  else if (totalTransactions >= 20) score += 15;
  else if (totalTransactions >= 10) score += 10;
  else if (totalTransactions >= 1)  score += 5;

  return Math.min(score, 100);
}

function calculateAchievements(stats: ProfileStats): Achievement[] {
  return [
    {
      id: 'first_transaction',
      title: 'Primer paso',
      description: 'Registraste tu primera transacción',
      icon: 'footsteps-outline',
      unlocked: stats.totalTransactions >= 1,
    },
    {
      id: 'ten_transactions',
      title: 'En racha',
      description: 'Registraste 10 transacciones',
      icon: 'flame-outline',
      unlocked: stats.totalTransactions >= 10,
    },
    {
      id: 'fifty_transactions',
      title: 'Disciplinado',
      description: 'Registraste 50 transacciones',
      icon: 'medal-outline',
      unlocked: stats.totalTransactions >= 50,
    },
    {
      id: 'first_goal',
      title: 'Soñador',
      description: 'Completaste tu primera meta',
      icon: 'trophy-outline',
      unlocked: stats.completedGoals >= 1,
    },
    {
      id: 'three_goals',
      title: 'Imparable',
      description: 'Completaste 3 metas',
      icon: 'star-outline',
      unlocked: stats.completedGoals >= 3,
    },
    {
      id: 'saver',
      title: 'Ahorrador',
      description: 'Tasa de ahorro mayor al 10%',
      icon: 'wallet-outline',
      unlocked: stats.savingsRate >= 10,
    },
    {
      id: 'super_saver',
      title: 'Super ahorrador',
      description: 'Tasa de ahorro mayor al 20%',
      icon: 'diamond-outline',
      unlocked: stats.savingsRate >= 20,
    },
    {
      id: 'week_user',
      title: 'Una semana',
      description: 'Llevas más de 7 días usando FinanceAI',
      icon: 'calendar-outline',
      unlocked: stats.daysUsing >= 7,
    },
  ];
}

export function useProfile(): UseProfileResult {
  const [profile,      setProfile]      = useState<UserProfile | null>(null);
  const [stats,        setStats]        = useState<ProfileStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profileData, globalStats, avgSavings] = await Promise.all([
        getProfile(),
        getGlobalStats(),
        getAverageMonthlySavings(),
      ]);

      setProfile(profileData);

      const joinedDate  = new Date(profileData.joinedAt);
      const daysUsing   = Math.floor(
        (Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const savingsRate = globalStats.totalIncome > 0
        ? ((globalStats.totalIncome - globalStats.totalExpenses) / globalStats.totalIncome) * 100
        : 0;

      const healthScore = calculateHealthScore(
        savingsRate,
        globalStats.completedGoals,
        globalStats.totalTransactions
      );

      const profileStats: ProfileStats = {
        totalTransactions:     globalStats.totalTransactions,
        totalIncome:           globalStats.totalIncome,
        totalExpenses:         globalStats.totalExpenses,
        averageMonthlySavings: avgSavings,
        completedGoals:        globalStats.completedGoals,
        activeGoals:           globalStats.activeGoals,
        daysUsing,
        savingsRate,
        healthScore,
      };

      setStats(profileStats);
      setAchievements(calculateAchievements(profileStats));
    } catch (err) {
      console.error('Error cargando perfil:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateName = useCallback(async (name: string) => {
    await updateProfile({ name });
    await load();
  }, [load]);

  const toggleFaceId = useCallback(async (enabled: boolean) => {
    await updateProfile({ faceIdEnabled: enabled });
    await load();
  }, [load]);

  return {
    profile,
    stats,
    achievements,
    isLoading,
    updateName,
    toggleFaceId,
    refresh: load,
  };
}