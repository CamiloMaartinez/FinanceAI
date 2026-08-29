import { scanReceiptServer } from '../../src/server/gemini';

export async function POST(request: Request) {
  let body: { base64Image?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { base64Image } = body;

  if (!base64Image || typeof base64Image !== 'string') {
    return Response.json({ error: 'Falta la imagen' }, { status: 400 });
  }

  try {
    const result = await scanReceiptServer(base64Image);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error analizando recibo';
    return Response.json({ error: message }, { status: 502 });
  }
}
