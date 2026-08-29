import { askFinancialAssistantServer, type FinancialContext } from '../../src/server/gemini';

export async function POST(request: Request) {
  let body: { question?: string; context?: FinancialContext };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { question, context } = body;

  if (!question || typeof question !== 'string' || !question.trim()) {
    return Response.json({ error: 'Falta la pregunta' }, { status: 400 });
  }
  if (!context) {
    return Response.json({ error: 'Falta el contexto financiero' }, { status: 400 });
  }

  try {
    const text = await askFinancialAssistantServer(question, context);
    return Response.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error consultando al asistente';
    return Response.json({ error: message }, { status: 502 });
  }
}
