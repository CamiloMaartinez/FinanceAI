// Despliega las rutas app/api/* a EAS Hosting SIN filtrar el token de la app.
//
// `expo export -p web` también genera la versión web del cliente, y toda
// variable EXPO_PUBLIC_* que use el código del cliente queda incrustada en
// ese JavaScript público. Por eso exportamos con EXPO_PUBLIC_APP_TOKEN vacío
// (el servidor solo necesita APP_TOKEN) y verificamos antes de publicar.
//
// Uso: npm run deploy:api

import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function readEnvValue(key) {
  const match = readFileSync('.env', 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match?.[1].trim().replace(/^["']|["']$/g, '') ?? '';
}

function filesUnder(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

const token = readEnvValue('APP_TOKEN');
if (!token) {
  console.error('Falta APP_TOKEN en .env');
  process.exit(1);
}

// Una variable que ya existe en el entorno (aunque esté vacía) tiene
// prioridad sobre .env, así que el cliente web se exporta sin token.
execSync('npx expo export -p web', {
  stdio: 'inherit',
  env: { ...process.env, EXPO_PUBLIC_APP_TOKEN: '' },
});

const leaked = filesUnder(join('dist', 'client')).filter((file) =>
  readFileSync(file, 'utf8').includes(token)
);
if (leaked.length > 0) {
  console.error('El token apareció en archivos públicos, no se despliega:', leaked);
  process.exit(1);
}

// El servidor lee APP_TOKEN (y GEMINI_API_KEY) de las variables de EAS del
// entorno production, no de .env. Sin ella, todas las rutas responden 500.
// Se quitan los códigos de color de la terminal (eas-cli resalta los nombres)
const easVars = execSync('npx eas env:list production', { encoding: 'utf8' }).replace(/\x1b\[[0-9;]*m/g, '');
if (!/^APP_TOKEN=/m.test(easVars)) {
  console.error(
    'Falta APP_TOKEN en las variables de EAS (production). Créala con el mismo valor de .env:\n' +
      '  npx eas env:create --name APP_TOKEN --environment production --visibility sensitive'
  );
  process.exit(1);
}

execSync('npx eas deploy --prod --environment production --non-interactive', { stdio: 'inherit' });
