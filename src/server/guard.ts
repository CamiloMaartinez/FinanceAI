// ⚠️ Solo para rutas +api.ts (app/api/**). Protege las rutas de IA para que
// nadie más que la app pueda gastar la cuota de Gemini:
//   1. Token compartido: la app manda el header `x-app-token`, que debe
//      coincidir con APP_TOKEN del servidor.
//   2. Límite de peticiones por IP (en memoria, "mejor esfuerzo": EAS Hosting
//      puede repartir peticiones entre varias instancias).
//   3. Tamaño máximo del cuerpo, para que no nos manden archivos gigantes.

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

const hitsByIp = new Map<string, number[]>();

function clientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'desconocida'
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hitsByIp.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  hitsByIp.set(ip, recent);

  // Limpieza ocasional para que el mapa no crezca sin control
  if (hitsByIp.size > 1000) {
    for (const [key, times] of hitsByIp) {
      if (times.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) hitsByIp.delete(key);
    }
  }

  return recent.length > RATE_LIMIT_MAX_REQUESTS;
}

// Devuelve una Response de error si la petición no debe pasar, o null si
// está todo bien. Uso: `const blocked = guardRequest(request, 10_000); if (blocked) return blocked;`
export function guardRequest(request: Request, maxBodyBytes: number): Response | null {
  const expectedToken = process.env.APP_TOKEN;
  if (!expectedToken) {
    return Response.json(
      { error: 'Falta configurar APP_TOKEN en el servidor' },
      { status: 500 }
    );
  }

  if (request.headers.get('x-app-token') !== expectedToken) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (isRateLimited(clientIp(request))) {
    return Response.json(
      { error: 'Demasiadas peticiones, espera un minuto e inténtalo de nuevo' },
      { status: 429 }
    );
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > maxBodyBytes) {
    return Response.json({ error: 'La petición es demasiado grande' }, { status: 413 });
  }

  return null;
}
