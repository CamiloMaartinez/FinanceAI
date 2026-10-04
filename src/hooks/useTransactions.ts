import { useState, useCallback, useEffect } from 'react';
import {
  getAllTransactionsWithCategory,
  getAllCategories,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  createRecurring,
} from '../database/db';
import { getAllAccounts } from '../database/db';
import type { TransactionWithCategory, TransactionInput, Category, Account } from '../models/types';
import type { RecurrenceFrequency } from '../utils/recurrence';

interface UseTransactionsResult {
  transactions: TransactionWithCategory[];
  categories: Category[];
  accounts: Account[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  // Si viene `recurrence`, además del movimiento se crea la regla que lo
  // repetirá automáticamente (solo ingresos y gastos)
  addTransaction: (input: TransactionInput, recurrence?: RecurrenceFrequency | null) => Promise<void>;
  editTransaction: (tx: TransactionWithCategory, updated: TransactionInput) => Promise<void>;
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
    input: TransactionInput,
    recurrence?: RecurrenceFrequency | null
  ) => {
    await createTransaction(input);
    if (recurrence && (input.type === 'income' || input.type === 'expense')) {
      await createRecurring({ ...input, type: input.type }, recurrence, new Date(input.date));
    }
    await load();
  }, [load]);

  const removeTransaction = useCallback(async (tx: TransactionWithCategory) => {
    await deleteTransaction(tx);
    await load();
  }, [load]);

  const editTransaction = useCallback(async (
    tx: TransactionWithCategory,
    updated: TransactionInput
  ) => {
    await updateTransaction(
      tx.id,
      { amount: tx.amount, type: tx.type, accountId: tx.accountId, toAccountId: tx.toAccountId ?? null },
      updated
    );
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
    editTransaction,
    removeTransaction,
  };
}
