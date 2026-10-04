import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { filterTransactions, matchesSearch } from '../src/utils/transactionFilters';
import type { TransactionWithCategory } from '../src/models/types';
import type { TransactionFiltersState } from '../src/components/TransactionFilters';

const NO_FILTERS: TransactionFiltersState = { categoryIds: [], accountIds: [], dateRange: 'all', typeFilter: 'all' };
const TODAY = new Date(2026, 9, 15, 12);

beforeEach(() => { jest.useFakeTimers({ now: TODAY }); });
afterEach(() => { jest.useRealTimers(); });

function tx(overrides: Partial<TransactionWithCategory>): TransactionWithCategory {
  return {
    id: Math.random().toString(36), amount: 10_000, type: 'expense', date: TODAY.toISOString(),
    accountId: 'acc-ahorros', accountName: 'Ahorros', categoryId: null, notes: '', tags: [], createdAt: '',
    ...overrides,
  };
}

const daysAgo = (n: number) => new Date(TODAY.getTime() - n * 86_400_000).toISOString();

describe('búsqueda', () => {
  it('ignora tildes y mayúsculas', () => {
    expect(matchesSearch(tx({ notes: 'Café con amigos' }), 'CAFE')).toBe(true);
  });

  it('busca en la categoría, la cuenta y el monto', () => {
    expect(matchesSearch(tx({ categoryName: 'Transporte' }), 'transp')).toBe(true);
    expect(matchesSearch(tx({ accountName: 'Nequi' }), 'nequi')).toBe(true);
    expect(matchesSearch(tx({ amount: 45_900 }), '45900')).toBe(true);
    expect(matchesSearch(tx({ notes: 'Almuerzo' }), 'cine')).toBe(false);
  });

  it('encuentra una transferencia por la cuenta destino', () => {
    expect(matchesSearch(tx({ type: 'transfer', toAccountId: 'acc-nequi', toAccountName: 'Nequi' }), 'nequi')).toBe(true);
  });
});

describe('filtros', () => {
  const all = [
    tx({ id: 'gasto', type: 'expense', categoryId: 'cat-food' }),
    tx({ id: 'ingreso', type: 'income', accountId: 'acc-nequi', accountName: 'Nequi' }),
    tx({ id: 'viejo', type: 'expense', date: daysAgo(40) }),
    tx({ id: 'transfer', type: 'transfer', accountId: 'acc-ahorros', toAccountId: 'acc-nequi', toAccountName: 'Nequi' }),
  ];
  const ids = (filters: Partial<TransactionFiltersState>) =>
    filterTransactions(all, '', { ...NO_FILTERS, ...filters }).map((t) => t.id);

  it('por tipo', () => {
    expect(ids({ typeFilter: 'income' })).toEqual(['ingreso']);
  });

  it('por categoría', () => {
    expect(ids({ categoryIds: ['cat-food'] })).toEqual(['gasto']);
  });

  it('por fecha: últimos 30 días', () => {
    expect(ids({ dateRange: '30d' })).not.toContain('viejo');
  });

  it('por cuenta: incluye las transferencias que ENTRAN a esa cuenta', () => {
    expect(ids({ accountIds: ['acc-nequi'] })).toEqual(['ingreso', 'transfer']);
  });

  it('por cuenta: incluye las transferencias que SALEN de esa cuenta', () => {
    expect(ids({ accountIds: ['acc-ahorros'] })).toEqual(['gasto', 'viejo', 'transfer']);
  });
});
