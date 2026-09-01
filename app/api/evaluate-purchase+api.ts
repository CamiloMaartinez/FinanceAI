import { evaluatePurchaseServer, type FinancialContext } from '../../src/server/gemini';

export async function POST(request: Request) {
  let body: { itemDescription?: string; price?: number; context?: FinancialContext };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { itemDescription, price, context } = body;

  if (typeof price !== 'number' || price <= 0) {
    return Response.json({ error: 'Falta un precio válido' }, { status: 400 });
  }
  if (!context) {
    return Response.json({ error: 'Falta el contexto financiero' }, { status: 400 });
  }

  try {
    const result = await evaluatePurchaseServer(itemDescription ?? '', price, context);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error evaluando la compra';
    return Response.json({ error: message }, { status: 502 });
  }
}
