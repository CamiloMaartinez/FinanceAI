/**
 * @jest-environment node
 */
// Entorno "node": las rutas de API corren en el servidor, con Request y
// Response estándar, no dentro de la app.
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type * as GuardModule from '../src/server/guard';

const TOKEN = 'a'.repeat(64);
let guardRequest: typeof GuardModule.guardRequest;

beforeEach(() => {
  // Módulo nuevo en cada prueba: el contador de peticiones vive en memoria
  jest.resetModules();
  process.env.APP_TOKEN = TOKEN;
  guardRequest = require('../src/server/guard').guardRequest;
});
afterEach(() => {
  delete process.env.APP_TOKEN;
});

function request(headers: Record<string, string> = {}): Request {
  return new Request('https://example.test/api/assistant', {
    method: 'POST',
    headers: { 'x-app-token': TOKEN, 'cf-connecting-ip': '1.2.3.4', ...headers },
  });
}

describe('token de la app', () => {
  it('deja pasar una petición con el token correcto', () => {
    expect(guardRequest(request(), 50_000)).toBeNull();
  });

  it('rechaza sin token o con un token falso (401)', async () => {
    const sinToken = new Request('https://example.test/api/assistant', { method: 'POST' });
    expect(guardRequest(sinToken, 50_000)?.status).toBe(401);
    const falso = guardRequest(request({ 'x-app-token': 'falso' }), 50_000);
    expect(falso?.status).toBe(401);
    expect(await falso?.json()).toEqual({ error: 'No autorizado' });
  });

  it('responde 500 si el servidor no tiene APP_TOKEN configurado', () => {
    delete process.env.APP_TOKEN;
    expect(guardRequest(request(), 50_000)?.status).toBe(500);
  });
});

describe('límite de peticiones', () => {
  it('permite 20 por minuto por IP y bloquea la 21 (429)', () => {
    for (let i = 0; i < 20; i++) {
      expect(guardRequest(request(), 50_000)).toBeNull();
    }
    expect(guardRequest(request(), 50_000)?.status).toBe(429);
  });

  it('cuenta cada IP por separado', () => {
    for (let i = 0; i < 21; i++) guardRequest(request(), 50_000);
    expect(guardRequest(request({ 'cf-connecting-ip': '5.6.7.8' }), 50_000)).toBeNull();
  });

  it('vuelve a permitir pasado un minuto', () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 4, 12, 0, 0) });
    for (let i = 0; i < 21; i++) guardRequest(request(), 50_000);
    jest.setSystemTime(new Date(2026, 9, 4, 12, 1, 1));
    expect(guardRequest(request(), 50_000)).toBeNull();
    jest.useRealTimers();
  });
});

describe('tamaño de la petición', () => {
  it('rechaza cuerpos más grandes que el límite (413)', () => {
    expect(guardRequest(request({ 'content-length': '50001' }), 50_000)?.status).toBe(413);
    expect(guardRequest(request({ 'content-length': '50000' }), 50_000)).toBeNull();
  });
});
