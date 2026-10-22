/* eslint-disable */
// Genera el logo que lleva el informe PDF (src/services/report/brandLogo.ts).
// Uso: node scripts/report-assets.cjs  (después de scripts/brand-assets.cjs)
//
// El PDF se arma con HTML dentro de expo-print: las imágenes tienen que ir
// incrustadas como data URI. Se usa una versión pequeña de la "S" para que
// el HTML no pese medio mega y funcione sin conexión.
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp-compact');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'assets/brand/logo-mark.png');
const OUT = path.join(ROOT, 'src/services/report/brandLogo.ts');
const HEIGHT = 112; // 2× del tamaño mayor en el PDF (56 px)

(async () => {
  const img = await Jimp.read(SRC);
  img.resize(Math.round((img.bitmap.width / img.bitmap.height) * HEIGHT), HEIGHT);
  const png = await img.getBufferAsync(Jimp.MIME_PNG);
  const ratio = img.bitmap.width / img.bitmap.height;
  const body =
    '// Generado por scripts/report-assets.cjs a partir de assets/brand/logo-mark.png.\n' +
    '// No editar a mano: vuelve a correr el script si cambia el logo.\n\n' +
    `/** Ancho / alto de la "S". */\nexport const BRAND_LOGO_RATIO = ${ratio.toFixed(4)};\n\n` +
    `/** La "S" de Smart Finance como data URI (PNG con transparencia). */\n` +
    `export const BRAND_LOGO_DATA_URI =\n  'data:image/png;base64,${png.toString('base64')}';\n`;
  fs.writeFileSync(OUT, body);
  console.log(`Listo: ${path.relative(ROOT, OUT)} (${(png.length / 1024).toFixed(1)} KB)`);
})();
