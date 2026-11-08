// Configuración dinámica de Expo.
// Parte de app.json y solo la ajusta cuando se construye la versión web
// pública (página promocional + app en /app). En cualquier otro caso
// devuelve app.json tal cual, así que la app móvil y `npm run deploy:api`
// siguen funcionando igual.
module.exports = ({ config }) => {
  if (process.env.SF_WEB_DEMO !== '1') return config;

  return {
    ...config,
    web: {
      ...config.web,
      // Sitio estático (sin servidor): todo se ejecuta en el navegador.
      output: 'single',
    },
    experiments: {
      ...config.experiments,
      // La app vive en https://<dominio>/app; la raíz es la página promocional.
      baseUrl: '/app',
    },
  };
};
