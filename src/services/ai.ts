// Cliente ligero que llama a nuestras propias rutas /api/* (ver app/api/).
// La API Key de Gemini NUNCA vive aquí ni en ningún archivo del cliente:
// vive del lado del servidor en src/server/gemini.ts.

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

interface FinancialContext {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  topCategories: { name: string; amount: number }[];
  activeGoals: { name: string; targetAmount: number; currentAmount: number; targetDate: string }[];
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error ?? `Error del servidor (${response.status})`);
  }

  return data as T;
}

export async function askFinancialAssistant(
  question: string,
  context: FinancialContext
): Promise<string> {
  const { text } = await postJson<{ text: string }>('/api/assistant', { question, context });
  return text;
}

// Sugiere una categoría automáticamente basándose en el texto de la transacción
export async function suggestCategory(
  description: string,
  availableCategories: string[]
): Promise<string | null> {
  try {
    const { category } = await postJson<{ category: string | null }>('/api/suggest-category', {
      description,
      availableCategories,
    });
    return category;
  } catch {
    return null;
  }
}
