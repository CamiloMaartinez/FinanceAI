import { suggestBudgetServer } from '../../src/server/gemini';
import { guardRequest } from '../../src/server/guard';
import type { BudgetHistory } from '../../src/utils/budgetSuggestion';

export async function POST(request: Request) {
  const blocked = guardRequest(request, 50_000);
  if (blocked) return blocked;

  let body: { history?: BudgetHistory };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const history = body.history;
  if (!history || !Array.isArray(history.categories) || typeof history.monthlyIncome !== 'number') {
    return Response.json({ error: 'Falta el historial de gastos' }, { status: 400 });
  }

  const suggestion = await suggestBudgetServer({
    monthsAnalyzed: Number(history.monthsAnalyzed) || 1,
    monthlyIncome: history.monthlyIncome,
    categories: history.categories
      .filter((c) => typeof c?.categoryId === 'string' && typeof c?.monthlyAverage === 'number')
      .map((c) => ({ categoryId: c.categoryId, name: String(c.name ?? ''), monthlyAverage: c.monthlyAverage })),
  });
  return Response.json(suggestion);
}
