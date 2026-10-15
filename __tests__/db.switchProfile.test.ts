import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type * as DbModule from '../src/database/db';

// Cambio de perfil sin cerrar la app: la conexión abierta no se puede seguir
// usando, o el perfil nuevo vería los datos del anterior.
describe('switchDatabase', () => {
  let db: typeof DbModule;

  beforeEach(() => {
    jest.resetModules();
    db = require('../src/database/db');
  });

  it('abre la base del perfil nuevo en vez de reutilizar la anterior', async () => {
    db.setDatabaseFileName('perfil-a.db');
    await db.createAccount('Nequi', 'digital', 100_000, '#D9DAFB', 'billetera', 'COP', null);
    expect(await db.getAllAccounts()).toHaveLength(1);

    await db.switchDatabase('perfil-b.db');
    expect(await db.getAllAccounts()).toHaveLength(0);
  });

  it('con el mismo archivo no cierra nada', async () => {
    db.setDatabaseFileName('perfil-a.db');
    await db.createAccount('Nequi', 'digital', 100_000, '#D9DAFB', 'billetera', 'COP', null);
    await db.switchDatabase('perfil-a.db');
    expect(await db.getAllAccounts()).toHaveLength(1);
  });
});
