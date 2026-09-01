import { generateWeeklySummaryServer, type WeeklySummaryContext } from '../../src/server/gemini';

export async function POST(request: Request) {
  let body: WeeklySummaryContext;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!body.weekStartLabel || !body.weekEndLabel) {
    return Response.json({ error: 'Falta el rango de la semana' }, { status: 400 });
  }

  try {
    const text = await generateWeeklySummaryServer(body);
    return Response.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error generando el resumen semanal';
    return Response.json({ error: message }, { status: 502 });
  }
}
