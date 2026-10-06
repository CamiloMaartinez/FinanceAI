import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import BudgetsScreen from '../../app/(tabs)/(more)/budgets';
import { getDb, createAccount, getAllAccounts, createTransaction, getBudgetForMonth } from '../../src/database/db';

// La IA responde desde el servidor: aquí se simula su propuesta
jest.mock('../../src/services/ai', () => ({
  suggestBudget: jest.fn(async () => ({
    totalLimit: 900_000,
    categoryLimits: { 'cat-food': 600_000, 'cat-rest': 300_000 },
    explanation: 'Recorta restaurantes en $100.000 para ahorrar.',
    source: 'ai',
  })),
}));

async function seedHistory() {
  const db = await getDb();
  await db.runAsync(`INSERT INTO categories (id, name, iconName, colorHex, isDefault, subcategories) VALUES ('cat-food', 'Comida', 'fast-food-outline', '#FF9500', 1, '[]')`);
  await db.runAsync(`INSERT INTO categories (id, name, iconName, colorHex, isDefault, subcategories) VALUES ('cat-rest', 'Restaurantes', 'restaurant-outline', '#FF3B30', 1, '[]')`);
  await createAccount('Ahorros', 'savings', 5_000_000, '#0A84FF', 'wallet');
  const accountId = (await getAllAccounts())[0].id;
  // Un gasto en cada uno de los 2 meses anteriores al actual
  const now = new Date();
  for (const back of [1, 2]) {
    const date = new Date(now.getFullYear(), now.getMonth() - back, 10, 12).toISOString();
    await createTransaction({ type: 'expense', amount: 600_000, accountId, toAccountId: null, categoryId: 'cat-food', notes: 'Mercado', date });
    await createTransaction({ type: 'expense', amount: 400_000, accountId, toAccountId: null, categoryId: 'cat-rest', notes: 'Restaurante', date });
  }
}

describe('presupuesto sugerido por IA (flujo completo)', () => {
  it('desde la pantalla vacía: pedir la sugerencia, revisarla y guardarla', async () => {
    await seedHistory();
    await render(<BudgetsScreen />);
    await waitFor(() => expect(screen.getByText('Sin presupuesto definido')).toBeTruthy());

    await fireEvent.press(screen.getByText('Sugerir con IA'));

    // El formulario se abre con la propuesta y la explicación de la IA
    await waitFor(() => expect(screen.getByText('Recorta restaurantes en $100.000 para ahorrar.')).toBeTruthy());
    expect(screen.getByDisplayValue('900000')).toBeTruthy();

    await fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(screen.getByText('Presupuesto sugerido por IA')).toBeTruthy());

    const now = new Date();
    const saved = await getBudgetForMonth(now.getMonth() + 1, now.getFullYear());
    expect(saved).toMatchObject({ totalLimit: 900_000, categoryLimits: { 'cat-food': 600_000, 'cat-rest': 300_000 } });
    expect(saved?.isAIGenerated).toBeTruthy();
  });
});
