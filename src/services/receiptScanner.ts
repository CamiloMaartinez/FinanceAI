// Cliente ligero: envía la imagen a nuestra ruta /api/scan-receipt, que es
// quien habla con Gemini del lado del servidor (ver src/server/gemini.ts).

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export interface ScannedReceipt {
  amount: number | null;
  merchant: string | null;
  suggestedNotes: string;
}

export async function scanReceipt(base64Image: string): Promise<ScannedReceipt> {
  const response = await fetch(`${API_BASE_URL}/api/scan-receipt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error ?? `Error analizando recibo (${response.status})`);
  }

  return data as ScannedReceipt;
}
