import { useState, useCallback, useEffect } from 'react';
import {
  getAllCards,
  createCard,
  toggleFavoriteCard,
  deleteCard,
} from '../database/db';
import type { Card } from '../models/types';

interface UseCardsResult {
  cards: Card[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addCard: (
    name: string,
    bank: string,
    annualFee: number,
    cashbackPercent: number,
    interestRate: number,
    benefits: string[],
    colorHex: string
  ) => Promise<void>;
  toggleFavorite: (id: string, isFavorite: boolean) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
}

export function useCards(): UseCardsResult {
  const [cards,     setCards]     = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await getAllCards();
      setCards(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando tarjetas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addCard = useCallback(async (
    name: string,
    bank: string,
    annualFee: number,
    cashbackPercent: number,
    interestRate: number,
    benefits: string[],
    colorHex: string
  ) => {
    await createCard(name, bank, annualFee, cashbackPercent, interestRate, benefits, colorHex);
    await load();
  }, [load]);

  const toggleFavorite = useCallback(async (id: string, isFavorite: boolean) => {
    await toggleFavoriteCard(id, isFavorite);
    await load();
  }, [load]);

  const removeCard = useCallback(async (id: string) => {
    await deleteCard(id);
    await load();
  }, [load]);

  return {
    cards,
    isLoading,
    error,
    refresh: load,
    addCard,
    toggleFavorite,
    removeCard,
  };
}