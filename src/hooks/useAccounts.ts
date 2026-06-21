import { useState, useCallback, useEffect } from 'react';
import {
  getAllAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../database/db';
import type { Account } from '../models/types';

interface UseAccountsResult {
  accounts: Account[];
  totalBalance: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addAccount: (
    name: string,
    type: string,
    balance: number,
    colorHex: string,
    iconName: string
  ) => Promise<void>;
  editAccount: (
    id: string,
    name: string,
    type: string,
    colorHex: string,
    iconName: string
  ) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
}

export function useAccounts(): UseAccountsResult {
  const [accounts,  setAccounts]  = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await getAllAccounts();
      setAccounts(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando cuentas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addAccount = useCallback(async (
    name: string,
    type: string,
    balance: number,
    colorHex: string,
    iconName: string
  ) => {
    await createAccount(name, type, balance, colorHex, iconName);
    await load();
  }, [load]);

  const editAccount = useCallback(async (
    id: string,
    name: string,
    type: string,
    colorHex: string,
    iconName: string
  ) => {
    await updateAccount(id, name, type, colorHex, iconName);
    await load();
  }, [load]);

  const removeAccount = useCallback(async (id: string) => {
    await deleteAccount(id);
    await load();
  }, [load]);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return {
    accounts,
    totalBalance,
    isLoading,
    error,
    refresh: load,
    addAccount,
    editAccount,
    removeAccount,
  };
}