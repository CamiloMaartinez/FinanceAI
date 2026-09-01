// ⚠️ Este archivo SOLO debe ser importado desde rutas +api.ts (app/api/**).
// Corre en el servidor (o en el proceso de Metro durante desarrollo), nunca
// se empaqueta dentro de la app que se instala en el teléfono. Por eso es
// seguro leer aquí la API Key real desde process.env.GEMINI_API_KEY (SIN
// el prefijo EXPO_PUBLIC_, que es justamente lo que la mantiene fuera del
// bundle del cliente).

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

export interface FinancialContext {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  topCategories: { name: string; amount: number }[];
  activeGoals: { name: string; targetAmount: number; currentAmount: number; targetDate: string }[];
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('Falta configurar GEMINI_API_KEY en el servidor (.env o variables de EAS)');
  }
  return key;
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
  contents: any[],
  maxOutputTokens: number,
  temperature: number,
  retries: number = 3
): Promise<string> {
  const apiKey = getApiKey();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents,
          generationConfig: { maxOutputTokens, temperature },
        }),
      });

      // Si el servidor está saturado (503) o hay demasiadas peticiones (429), reintentamos
      if (response.status === 503 || response.status === 429) {
        lastError = new Error(`Servidor ocupado (${response.status})`);
        if (attempt < retries) {
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

export async function askFinancialAssistantServer(
  question: string,
  context: FinancialContext
): Promise<string> {
  const systemContext = buildSystemContext(context);
  const fullPrompt = `${systemContext}\n\nPregunta del usuario: ${question}`;
  return callGeminiWithRetry(
    [{ role: 'user', parts: [{ text: fullPrompt }] }],
    700,
    0.7
  );
}

export async function suggestCategoryServer(
  description: string,
  availableCategories: string[]
): Promise<string | null> {
  const prompt = `Dado el siguiente texto de una transacción financiera: "${description}", elige la categoría más adecuada de esta lista exacta: ${availableCategories.join(', ')}. Responde ÚNICAMENTE con el nombre exacto de la categoría, sin explicación ni puntuación adicional.`;

  try {
    const text = await callGeminiWithRetry(
      [{ role: 'user', parts: [{ text: prompt }] }],
      20,
      0.1,
      1
    );
    const trimmed = text.trim().replace(/[.,]+$/, '');
    // Comparación tolerante a mayúsculas/espacios, pero devolvemos el nombre
    // EXACTO de la lista original para que el cliente pueda hacer match por igualdad.
    const match = availableCategories.find(
      (cat) => cat.trim().toLowerCase() === trimmed.toLowerCase()
    );
    return match ?? null;
  } catch {
    return null;
  }
}

export interface PurchaseEvaluation {
  verdict: 'si' | 'con_cuidado' | 'mejor_espera';
  reasoning: string;
}

export async function evaluatePurchaseServer(
  itemDescription: string,
  price: number,
  context: FinancialContext
): Promise<PurchaseEvaluation> {
  const systemContext = buildSystemContext(context);
  const prompt = `${systemContext}

El usuario quiere saber si puede comprar lo siguiente:
Artículo: ${itemDescription || 'Sin descripción específica'}
Precio: ${Math.round(price)} pesos colombianos

Evalúa considerando su saldo actual, sus gastos e ingresos del mes, y si tiene metas de ahorro activas que se verían comprometidas. Responde ÚNICAMENTE con este JSON exacto, sin texto adicional ni backticks:
{"verdict": "si" | "con_cuidado" | "mejor_espera", "reasoning": "explicación breve en 2-3 oraciones, en español, sin formato markdown"}

Usa "si" si la compra no compromete su presupuesto ni sus metas. Usa "con_cuidado" si es posible pero representa una porción importante de su saldo o afecta parcialmente sus metas. Usa "mejor_espera" si comprometería seriamente su saldo, sus gastos básicos o sus metas de ahorro.`;

  const text = await callGeminiWithRetry(
    [{ role: 'user', parts: [{ text: prompt }] }],
    300,
    0.3
  );

  const cleanText = text.replace(/```json|```/g, '').trim();

  try {
    const parsed = JSON.parse(cleanText);
    const verdict: PurchaseEvaluation['verdict'] =
      ['si', 'con_cuidado', 'mejor_espera'].includes(parsed.verdict) ? parsed.verdict : 'con_cuidado';
    return {
      verdict,
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : 'No se pudo generar una explicación.',
    };
  } catch {
    throw new Error('No se pudo interpretar la evaluación de la IA');
  }
}

export interface ScannedReceipt {
  amount: number | null;
  merchant: string | null;
  suggestedNotes: string;
}

export async function scanReceiptServer(base64Image: string): Promise<ScannedReceipt> {
  const prompt = `Analiza esta imagen de un recibo o factura de compra. Extrae:
1. El monto TOTAL de la compra (solo el número final a pagar, sin símbolos de moneda ni puntos/comas)
2. El nombre del comercio o establecimiento

Responde ÚNICAMENTE en este formato JSON exacto, sin texto adicional ni explicaciones:
{"amount": numero_o_null, "merchant": "nombre_o_null"}

Si no puedes identificar claramente el monto o el comercio, usa null en ese campo.`;

  const text = await callGeminiWithRetry(
    [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
        ],
      },
    ],
    200,
    0.1
  );

  const cleanText = text.replace(/```json|```/g, '').trim();

  try {
    const parsed = JSON.parse(cleanText);
    return {
      amount: typeof parsed.amount === 'number' ? parsed.amount : null,
      merchant: typeof parsed.merchant === 'string' ? parsed.merchant : null,
      suggestedNotes: parsed.merchant || 'Recibo escaneado',
    };
  } catch {
    throw new Error('No se pudo interpretar la información del recibo');
  }
}
