// Construye el sitio web público de Smart Finance:
//   /       → página promocional (web/promo)
//   /app/   → la app completa exportada para navegador (Expo web)
//
// Uso: npm run build:web   (Vercel lo ejecuta automáticamente, ver vercel.json)
//
// SF_SITE=pitch construye la página del pitch (web/pitch) en lugar de la
// promocional. Reutiliza las imágenes, fuentes y estilos de web/promo.

import { execSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SITE =
  process.env.SF_SITE === 'pitch' || (process.env.VERCEL_PROJECT_PRODUCTION_URL ?? '').includes('pitch') ? 'pitch' : 'promo';
const OUT = 'dist-web';
const APP = join(OUT, 'app');

rmSync(OUT, { recursive: true, force: true });

// 1. App para navegador. SF_WEB_DEMO activa la salida estática con base /app
//    (ver app.config.js). El token se vacía para que nunca quede en el JS público.
execSync(`npx expo export -p web --output-dir ${APP}`, {
  stdio: 'inherit',
  env: { ...process.env, SF_WEB_DEMO: '1', EXPO_PUBLIC_APP_TOKEN: '' },
});

// 2. Página en la raíz: la promocional, y encima la del pitch si se pidió.
cpSync('web/promo', OUT, { recursive: true });
if (SITE === 'pitch') cpSync('web/pitch', OUT, { recursive: true });

// 3. La app se puede "instalar" en la pantalla de inicio del celular (PWA).
writeFileSync(
  join(APP, 'manifest.webmanifest'),
  JSON.stringify(
    {
      name: 'Smart Finance',
      short_name: 'Smart Finance',
      description: 'Tu dinero, bajo control.',
      lang: 'es',
      start_url: '/app/',
      scope: '/app/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#2E1A78',
      theme_color: '#2E1A78',
      icons: [
        { src: '/img/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/img/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    null,
    2
  )
);

const indexPath = join(APP, 'index.html');
if (!existsSync(indexPath)) throw new Error('La exportación web no generó app/index.html');

const head = [
  '<link rel="manifest" href="/app/manifest.webmanifest" />',
  '<meta name="theme-color" content="#2E1A78" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '<meta name="apple-mobile-web-app-title" content="Smart Finance" />',
  '<link rel="apple-touch-icon" href="/img/apple-touch-icon.png" />',
  '<style>html,body{background:#2E1A78}</style>',
].join('\n    ');

const html = readFileSync(indexPath, 'utf8')
  .replace('<html lang="en">', '<html lang="es">')
  .replace('viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"', 'viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"')
  .replace('</head>', `    ${head}\n  </head>`);
writeFileSync(indexPath, html);

console.log(`\nSitio listo en ${OUT}/ (${SITE} en /, app en /app/)`);
