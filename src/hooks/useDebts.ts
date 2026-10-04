import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  getAllDebts,
  getAllAccounts,
  createDebt,
  addDebtPayment,
  deleteDebt,
  type DebtInput,
} from '../database/db';
import { scheduleDebtReminders, cancelDebtReminders } from '../services/debtReminders';
import type { Account, Debt } from '../models/types';

export function useDebts() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [d, a] = await Promise.all([getAllDebts(), getAllAccounts()]);
      setDebts(d);
      setAccounts(a);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Lo que falta por cobrar y por pagar, solo de las deudas abiertas
  const totals = useMemo(() => {
    const open = debts.filter((d) => !d.isSettled);
    const sum = (dir: Debt['direction']) =>
      open.filter((d) => d.direction === dir).reduce((s, d) => s + d.remaining, 0);
    return { owedToMe: sum('owed_to_me'), iOwe: sum('i_owe') };
  }, [debts]);

  const addDebt = useCallback(async (input: DebtInput) => {
    const id = await createDebt(input);
    await scheduleDebtReminders({ ...input, id, remaining: input.amount }).catch(() => {});
    await load();
  }, [load]);

  // Devuelve true si con el abono quedó saldada
  const addPayment = useCallback(async (debt: Debt, amount: number, date: string, accountId: string | null) => {
    const settled = await addDebtPayment(debt.id, amount, date, accountId);
    await scheduleDebtReminders({ ...debt, remaining: debt.remaining - amount }).catch(() => {});
    await load();
    return settled;
  }, [load]);

  const removeDebt = useCallback(async (debt: Debt) => {
    await deleteDebt(debt.id);
    await cancelDebtReminders(debt.id).catch(() => {});
    await load();
  }, [load]);

  return { debts, accounts, totals, isLoading, refresh: load, addDebt, addPayment, removeDebt };
}
