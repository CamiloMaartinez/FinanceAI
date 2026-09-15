import { useState, useCallback, useEffect } from 'react';
import {
  getAllAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getTotalBalance,
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
    iconName: string,
    currency: string
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
  const [accounts,     setAccounts]     = useState<Account[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [isLoading,    setIsLoading]    = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // getTotalBalance ya convierte cuentas en USD/EUR a pesos usando las
      // tasas de cambio guardadas, así que el total siempre queda correcto
      // aunque mezcles monedas entre tus cuentas.
      const [rows, total] = await Promise.all([
        getAllAccounts(),
        getTotalBalance(),
      ]);
      setAccounts(rows);
      setTotalBalance(total);
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
    iconName: string,
    currency: string
  ) => {
    await createAccount(name, type, balance, colorHex, iconName, currency);
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
