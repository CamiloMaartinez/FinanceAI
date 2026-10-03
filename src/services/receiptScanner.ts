// Cliente ligero: envía la imagen a nuestra ruta /api/scan-receipt, que es
// quien habla con Gemini del lado del servidor (ver src/server/gemini.ts).

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
// Token que exige src/server/guard.ts. Se incrusta al compilar (secreto de
// GitHub Actions); no es infalible, pero impide que cualquiera use la API.
const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? '';

export interface ScannedReceipt {
  amount: number | null;
  merchant: string | null;
  suggestedNotes: string;
}

export async function scanReceipt(base64Image: string): Promise<ScannedReceipt> {
  const response = await fetch(`${API_BASE_URL}/api/scan-receipt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-app-token': APP_TOKEN },
    body: JSON.stringify({ base64Image }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error ?? `Error analizando recibo (${response.status})`);
  }

  return data as ScannedReceipt;
}
