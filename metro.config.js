// Config de Metro para este proyecto.
// Necesaria SOLO para que `npx expo export --platform web` (paso previo a
// `eas deploy`) pueda empaquetar sin errores. La app móvil real no usa
// nada de esto — expo-sqlite en el navegador depende de un archivo .wasm
// que Metro no reconoce como asset por defecto, y eso hace fallar el
// export web aunque ninguna ruta de IA (app/api/*+api.ts) use la base de
// datos directamente.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Soporte de assets .wasm
config.resolver.assetExts.push('wasm');

// Headers COEP/COOP requeridos para SharedArrayBuffer (usado por el worker
// web de expo-sqlite) — sin esto Metro falla con "Worker chunk not found".
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;