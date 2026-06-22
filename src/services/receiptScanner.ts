const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

export interface ScannedReceipt {
  amount: number | null;
  merchant: string | null;
  suggestedNotes: string;
}

export async function scanReceipt(base64Image: string): Promise<ScannedReceipt> {
  if (!GEMINI_API_KEY) {
    throw new Error('Falta configurar la API Key de Gemini');
  }

  const prompt = `Analiza esta imagen de un recibo o factura de compra. Extrae:
1. El monto TOTAL de la compra (solo el número final a pagar, sin símbolos de moneda ni puntos/comas)
2. El nombre del comercio o establecimiento

Responde ÚNICAMENTE en este formato JSON exacto, sin texto adicional ni explicaciones:
{"amount": numero_o_null, "merchant": "nombre_o_null"}

Si no puedes identificar claramente el monto o el comercio, usa null en ese campo.`;

  const response = await fetch(`${GEMINI_URL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error analizando recibo: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No se pudo leer el recibo');
  }

  // Limpiar el texto por si la IA agrega ```json al inicio/final
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