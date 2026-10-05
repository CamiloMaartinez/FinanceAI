import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  getAllTransactionsWithCategory,
  getAllCategories,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  createRecurring,
  createSplitExpense,
} from '../database/db';
import { getAllAccounts } from '../database/db';
import type { TransactionWithCategory, TransactionInput, Category, Account } from '../models/types';
import type { RecurrenceFrequency } from '../utils/recurrence';
import { deleteReceiptPhoto } from '../services/receiptStorage';

interface UseTransactionsResult {
  transactions: TransactionWithCategory[];
  categories: Category[];
  accounts: Account[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  // Si viene `recurrence`, además del movimiento se crea la regla que lo
  // repetirá automáticamente (solo ingresos y gastos)
  // Si viene `splitWith`, el gasto se divide en partes iguales: se registra
  // solo la parte del usuario y cada persona queda debiéndole la suya
  addTransaction: (
    input: TransactionInput,
    recurrence?: RecurrenceFrequency | null,
    splitWith?: string[] | null
  ) => Promise<void>;
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

  // Recarga cada vez que se entra a la pantalla: así aparece lo que se creó
  // desde otras partes (deudas, extractos importados, recurrentes)
  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const addTransaction = useCallback(async (
    input: TransactionInput,
    recurrence?: RecurrenceFrequency | null,
    splitWith?: string[] | null
  ) => {
    if (splitWith && splitWith.length > 0 && input.type === 'expense') {
      await createSplitExpense(input, splitWith);
      await load();
      return;
    }
    await createTransaction(input);
    if (recurrence && (input.type === 'income' || input.type === 'expense')) {
      await createRecurring({ ...input, type: input.type }, recurrence, new Date(input.date));
    }
    await load();
  }, [load]);

  const removeTransaction = useCallback(async (tx: TransactionWithCategory) => {
    await deleteTransaction(tx);
    deleteReceiptPhoto(tx.receiptUri);
    await load();
  }, [load]);

  const editTransaction = useCallback(async (
    tx: TransactionWithCategory,
    updated: TransactionInput
  ) => {
    await updateTransaction(
      tx.id,
      { amount: tx.amount, type: tx.type, accountId: tx.accountId, toAccountId: tx.toAccountId ?? null, toAmount: tx.toAmount ?? null },
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
