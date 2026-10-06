import { useState, useCallback, useEffect } from 'react';
import {
  getAllAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  deleteAccountPermanently,
  setAccountBalance,
  getTotalBalance,
} from '../database/db';
import type { Account } from '../models/types';

/** Lo que entrega el formulario de cuentas (crear o editar). */
export interface AccountFormValues {
  name: string;
  type: string;
  /** Al crear: saldo inicial. Al editar: saldo nuevo (se ajusta con un movimiento). */
  balance: number;
  colorHex: string;
  gradientTo: string | null;
  iconName: string;
  currency: string;
}

interface UseAccountsResult {
  accounts: Account[];
  totalBalance: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addAccount: (values: AccountFormValues) => Promise<void>;
  /** Edita nombre, tipo, colores, ícono y (sin movimientos) moneda; si el saldo cambió, crea un ajuste. */
  editAccount: (account: Account, values: AccountFormValues) => Promise<void>;
  /** Oculta la cuenta sin borrar su historial. */
  archiveAccount: (id: string) => Promise<void>;
  /** Borra la cuenta; solo si no tiene movimientos. */
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

  const addAccount = useCallback(async (v: AccountFormValues) => {
    await createAccount(v.name.trim(), v.type, v.balance, v.colorHex, v.iconName, v.currency, v.gradientTo);
    await load();
  }, [load]);

  const editAccount = useCallback(async (account: Account, v: AccountFormValues) => {
    await updateAccount(account.id, {
      name: v.name,
      type: v.type,
      colorHex: v.colorHex,
      gradientTo: v.gradientTo,
      iconName: v.iconName,
      currency: v.currency,
    });
    if (v.balance !== account.balance) await setAccountBalance(account.id, v.balance);
    await load();
  }, [load]);

  const archiveAccount = useCallback(async (id: string) => {
    await deleteAccount(id);
    await load();
  }, [load]);

  const removeAccount = useCallback(async (id: string) => {
    await deleteAccountPermanently(id);
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
    archiveAccount,
    removeAccount,
  };
}
