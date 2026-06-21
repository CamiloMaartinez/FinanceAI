import { useState, useCallback, useEffect } from 'react';
import {
  getAllTransactionsWithCategory,
  getAllCategories,
  createTransaction,
  deleteTransaction,
} from '../database/db';
import { getAllAccounts } from '../database/db';
import type { TransactionWithCategory, Category, Account } from '../models/types';

interface UseTransactionsResult {
  transactions: TransactionWithCategory[];
  categories: Category[];
  accounts: Account[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addTransaction: (
    amount: number,
    type: string,
    date: string,
    accountId: string,
    categoryId: string | null,
    notes: string
  ) => Promise<void>;
  removeTransaction: (tx: TransactionWithCategory) => Promise<void>;
}

export function useTransactions(): UseTransactionsResult {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [accounts,     setAccounts]     = useState<Account[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [txs, cats, accs] = await Promise.all([
        getAllTransactionsWithCategory(),
        getAllCategories(),
        getAllAccounts(),
      ]);
      setTransactions(txs);
      setCategories(cats);
      setAccounts(accs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando datos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addTransaction = useCallback(async (
    amount: number,
    type: string,
    date: string,
    accountId: string,
    categoryId: string | null,
    notes: string
  ) => {
    await createTransaction(amount, type, date, accountId, categoryId, notes);
    await load();
  }, [load]);

  const removeTransaction = useCallback(async (tx: TransactionWithCategory) => {
    await deleteTransaction(tx.id, tx.amount, tx.type, tx.accountId);
    await load();
  }, [load]);

  return {
    transactions,
    categories,
    accounts,
    isLoading,
    error,
    refresh: load,
    addTransaction,
    removeTransaction,
  };
}