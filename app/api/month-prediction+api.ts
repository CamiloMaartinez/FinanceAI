import { generateMonthPredictionServer, type MonthPredictionContext } from '../../src/server/gemini';

export async function POST(request: Request) {
  let body: MonthPredictionContext;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (typeof body.spentSoFar !== 'number' || typeof body.projectedTotal !== 'number') {
    return Response.json({ error: 'Faltan datos de la proyección' }, { status: 400 });
  }

  try {
    const text = await generateMonthPredictionServer(body);
    return Response.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error generando la predicción';
    return Response.json({ error: message }, { status: 502 });
  }
}
