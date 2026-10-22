// Guarda solo el movimiento que llega del Atajo "Al recibir un mensaje"
// cuando se pide modo automático (financeai://transactions?mensaje=...&guardar=1).
// Si falta algún dato o puede ser un duplicado, no guarda nada y devuelve el
// motivo para abrir el formulario.

import { createTransaction } from '../database/db';
import { suggestCategory } from './ai';
import { autoSaveBlocker, type BankMessagePrefill, type ParsedBankMessage } from '../utils/bankMessage';
import type { Account, Category, TransactionInput, TransactionWithCategory } from '../models/types';

export type AutoSaveResult =
  | { status: 'saved'; id: string; input: TransactionInput }
  | { status: 'review'; reason: string; prefill: BankMessagePrefill };

export async function autoSaveFromMessage(
  prefill: BankMessagePrefill,
  currency: ParsedBankMessage['currency'],
  accounts: Account[],
  categories: Category[],
  history: TransactionWithCategory[]
): Promise<AutoSaveResult> {
  const blocker = autoSaveBlocker(prefill, currency, accounts, history);
  if (blocker) return { status: 'review', reason: blocker, prefill };

  // Un gasto necesita categoría: la del historial o, si es un comercio
  // nuevo, la que sugiera la IA
  let categoryId = prefill.categoryId ?? null;
  if (prefill.type === 'expense' && !categoryId) {
    const suggested = await suggestCategory(prefill.notes, categories.map((c) => c.name));
    categoryId = categories.find((c) => c.name === suggested)?.id ?? null;
    if (!categoryId) {
      return { status: 'review', reason: 'No supimos la categoría de este comercio. Elígela y guarda.', prefill };
    }
  }

  const input: TransactionInput = {
    amount: prefill.amount,
    type: prefill.type,
    date: prefill.date ?? new Date().toISOString(),
    accountId: prefill.accountId!,
    toAccountId: prefill.type === 'transfer' ? prefill.toAccountId ?? null : null,
    categoryId: prefill.type === 'expense' ? categoryId : null,
    notes: prefill.notes,
  };
  const id = await createTransaction(input);
  return { status: 'saved', id, input };
}
