const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
console.log('API Key cargada:', GEMINI_API_KEY ? 'SÍ (empieza con ' + GEMINI_API_KEY.substring(0, 6) + ')' : 'NO - está undefined');
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

interface FinancialContext {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  topCategories: { name: string; amount: number }[];
  activeGoals: { name: string; targetAmount: number; currentAmount: number; targetDate: string }[];
}

// Construye el "contexto financiero" en texto que se envía a la IA junto con la pregunta
function buildSystemContext(context: FinancialContext): string {
  const categoriesText = context.topCategories.length > 0
    ? context.topCategories.map((c) => `- ${c.name}: $${c.amount.toLocaleString('es-CO')}`).join('\n')
    : 'Sin gastos registrados este mes';

  const goalsText = context.activeGoals.length > 0
    ? context.activeGoals.map((g) =>
        `- ${g.name}: $${g.currentAmount.toLocaleString('es-CO')} de $${g.targetAmount.toLocaleString('es-CO')} (objetivo: ${new Date(g.targetDate).toLocaleDateString('es-CO')})`
      ).join('\n')
    : 'Sin metas activas';

  return `Eres un asistente financiero personal dentro de la app FinanceAI. Respondes en español, de forma breve, clara y práctica (máximo 5-6 oraciones completas, nunca cortes una idea a la mitad). No uses formato Markdown (nada de asteriscos, negritas o símbolos especiales), responde en texto plano. Nunca das asesoría financiera profesional formal — si te preguntan sobre inversiones específicas, aclaras que no eres asesor certificado. IMPORTANTE: los montos en pesos colombianos te los doy como números enteros simples (sin puntos ni comas); cuando los menciones en tu respuesta, usa el formato con puntos como separador de miles, por ejemplo 3480000 se escribe como $3.480.000.

Datos financieros actuales del usuario:
- Saldo total: ${Math.round(context.totalBalance)} pesos
- Ingresos del mes: ${Math.round(context.monthlyIncome)} pesos
- Gastos del mes: ${Math.round(context.monthlyExpenses)} pesos

Top categorías de gasto este mes:
${categoriesText}

Metas activas:
${goalsText}

Responde la siguiente pregunta del usuario usando estos datos reales cuando sea relevante.`;
}

async function callGeminiWithRetry(
  prompt: string,
  maxOutputTokens: number,
  temperature: number,
  retries: number = 3
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Falta configurar la API Key de Gemini en el archivo .env');
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens, temperature },
        }),
      });

      // Si el servidor está saturado (503) o hay demasiadas peticiones (429), reintentamos
      if (response.status === 503 || response.status === 429) {
        lastError = new Error(`Servidor ocupado (${response.status})`);
        if (attempt < retries) {
          // Espera progresiva: 1s, 2s, 3s antes de reintentar
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
          continue;
        }
        throw lastError;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error de Gemini: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('La IA no devolvió una respuesta válida');
      }

      return text.trim();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Error desconocido');
      if (attempt === retries) throw lastError;
    }
  }

  throw lastError ?? new Error('Error desconocido consultando a Gemini');
}

export async function askFinancialAssistant(
  question: string,
  context: FinancialContext
): Promise<string> {
  const systemContext = buildSystemContext(context);
  const fullPrompt = `${systemContext}\n\nPregunta del usuario: ${question}`;
  return callGeminiWithRetry(fullPrompt, 700, 0.7);
}

// Sugiere una categoría automáticamente basándose en el texto de la transacción
export async function suggestCategory(
  description: string,
  availableCategories: string[]
): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;

  const prompt = `Dado el siguiente texto de una transacción financiera: "${description}", elige la categoría más adecuada de esta lista exacta: ${availableCategories.join(', ')}. Responde ÚNICAMENTE con el nombre exacto de la categoría, sin explicación ni puntuación adicional.`;

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 20, temperature: 0.1 },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    return availableCategories.includes(text) ? text : null;
  } catch {
    return null;
  }
}