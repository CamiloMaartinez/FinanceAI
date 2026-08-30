import type { TransactionWithCategory } from '../models/types';
import type { TransactionFiltersState } from '../components/TransactionFilters';

// Quita tildes para que "cafe" encuentre "café"
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function matchesSearch(tx: TransactionWithCategory, query: string): boolean {
  if (!query.trim()) return true;
  const q = normalize(query.trim());

  const haystacks = [
    tx.notes ?? '',
    tx.categoryName ?? '',
    tx.accountName ?? '',
    String(Math.round(tx.amount)),
  ];

  return haystacks.some((h) => normalize(h).includes(q));
}

export function matchesFilters(tx: TransactionWithCategory, filters: TransactionFiltersState): boolean {
  if (filters.typeFilter !== 'all' && tx.type !== filters.typeFilter) return false;

  if (filters.categoryIds.length > 0) {
    if (!tx.categoryId || !filters.categoryIds.includes(tx.categoryId)) return false;
  }

  if (filters.accountIds.length > 0) {
    if (!filters.accountIds.includes(tx.accountId)) return false;
  }

  if (filters.dateRange !== 'all') {
    const txDate = new Date(tx.date);
    const now = new Date();

    if (filters.dateRange === '7d') {
      const cutoff = new Date();
      cutoff.setDate(now.getDate() - 7);
      if (txDate < cutoff) return false;
    } else if (filters.dateRange === '30d') {
      const cutoff = new Date();
      cutoff.setDate(now.getDate() - 30);
      if (txDate < cutoff) return false;
    } else if (filters.dateRange === 'month') {
      if (txDate.getMonth() !== now.getMonth() || txDate.getFullYear() !== now.getFullYear()) {
        return false;
      }
    }
  }

  return true;
}

export function filterTransactions(
  transactions: TransactionWithCategory[],
  query: string,
  filters: TransactionFiltersState
): TransactionWithCategory[] {
  return transactions.filter((tx) => matchesSearch(tx, query) && matchesFilters(tx, filters));
}
