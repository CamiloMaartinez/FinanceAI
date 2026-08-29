import { suggestCategoryServer } from '../../src/server/gemini';

export async function POST(request: Request) {
  let body: { description?: string; availableCategories?: string[] };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { description, availableCategories } = body;

  if (!description || typeof description !== 'string' || !description.trim()) {
    return Response.json({ error: 'Falta la descripción' }, { status: 400 });
  }
  if (!Array.isArray(availableCategories) || availableCategories.length === 0) {
    return Response.json({ error: 'Faltan las categorías disponibles' }, { status: 400 });
  }

  try {
    const category = await suggestCategoryServer(description, availableCategories);
    return Response.json({ category });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error sugiriendo categoría';
    return Response.json({ error: message }, { status: 502 });
  }
}
