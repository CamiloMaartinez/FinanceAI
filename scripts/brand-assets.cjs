/* eslint-disable */
// Genera los recursos de marca de Smart Finance a partir de los originales
// en assets/brand/source/. Uso: node scripts/brand-assets.cjs
//
// - icon.png           ícono de iOS (1024, sin transparencia), la S a sangre
// - adaptive-icon.png  primer plano del ícono de Android
// - splash-icon.png    la S sola con fondo transparente (splash nativo)
// - favicon.png        web
// - brand/logo-mark.png  la S recortada, para usos dentro de la app
const path = require('path');
const Jimp = require('jimp-compact');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'assets/brand/source/simbolo.jpg');
const out = (name) => path.join(ROOT, 'assets', name);

/** Máscara binaria de la S: brillo alto y sin las líneas finas del fondo. */
function symbolMask(img) {
  const { width: w, height: h, data } = img.bitmap;
  const bright = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    bright[i] = Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  }
  let mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = bright[i] > 52 ? 1 : 0;

  // Apertura (erosión + dilatación): borra las líneas de 1–6 px y deja la S
  const R = 6;
  const pass = (src, horizontal, keep) => {
    const dst = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let v = keep === 'min' ? 1 : 0;
        for (let k = -R; k <= R; k++) {
          const xx = horizontal ? x + k : x;
          const yy = horizontal ? y : y + k;
          const s = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : src[yy * w + xx];
          if (keep === 'min' && !s) { v = 0; break; }
          if (keep === 'max' && s) { v = 1; break; }
        }
        dst[y * w + x] = v;
      }
    }
    return dst;
  };
  mask = pass(pass(mask, true, 'min'), false, 'min');
  mask = pass(pass(mask, true, 'max'), false, 'max');

  // Solo los trozos grandes (las dos cuchillas de la S)
  const label = new Int32Array(w * h).fill(-1);
  const keep = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || label[i] !== -1) continue;
    const stack = [i];
    const members = [];
    label[i] = i;
    while (stack.length) {
      const p = stack.pop();
      members.push(p);
      const x = p % w, y = (p / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (mask[q] && label[q] === -1) { label[q] = i; stack.push(q); }
      }
    }
    // El fondo también tiene zonas claras: se descartan los trozos oscuros en promedio
    const mean = members.reduce((sum, p) => sum + bright[p], 0) / members.length;
    if (members.length > 8000 && mean > 110) for (const p of members) keep[p] = 1;
  }
  return { keep, bright, w, h };
}

/** La S con borde suave sobre fondo transparente, recortada a su caja. */
async function extractSymbol(img) {
  const { keep, bright, w, h } = symbolMask(img);
  // Borde suave: 3 px alrededor de la máscara, con alfa según el brillo
  const near = new Uint8Array(w * h);
  const E = 3;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!keep[y * w + x]) continue;
      for (let dy = -E; dy <= E; dy++) {
        for (let dx = -E; dx <= E; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) near[ny * w + nx] = 1;
        }
      }
    }
  }
  const outImg = img.clone();
  let minX = w, minY = h, maxX = 0, maxY = 0;
  outImg.scan(0, 0, w, h, function (x, y, idx) {
    const i = y * w + x;
    let a = 0;
    if (keep[i]) a = 255;
    else if (near[i]) a = Math.max(0, Math.min(255, ((bright[i] - 38) / 30) * 255));
    this.bitmap.data[idx + 3] = a;
    if (a > 0) {
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  });
  // Un desenfoque mínimo del alfa quita el dentado del borde
  return softenAlpha(outImg).crop(minX, minY, maxX - minX + 1, maxY - minY + 1);
}

/** Promedia el alfa en 3×3 para suavizar el borde. */
function softenAlpha(img) {
  const { width: w, height: h, data } = img.bitmap;
  const src = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) src[i] = data[i * 4 + 3];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += src[(y + dy) * w + x + dx];
      data[(y * w + x) * 4 + 3] = Math.round(sum / 9);
    }
  }
  return img;
}

/** Pone una imagen centrada en un lienzo cuadrado transparente. */
async function centered(img, canvas, fraction) {
  const scale = (canvas * fraction) / Math.max(img.bitmap.width, img.bitmap.height);
  const fitted = img.clone().scale(scale);
  const base = new Jimp(canvas, canvas, 0x00000000);
  base.composite(fitted, (canvas - fitted.bitmap.width) / 2, (canvas - fitted.bitmap.height) / 2);
  return base;
}

(async () => {
  const src = await Jimp.read(SRC);

  // iOS pone su propia máscara redondeada: la imagen va a sangre y sin alfa
  const icon = src.clone().crop(96, 96, 832, 832).resize(1024, 1024);
  await icon.writeAsync(out('icon.png'));
  // Android recorta en círculo dentro del 66 % central: la S ya cabe ahí
  await src.clone().resize(1024, 1024).writeAsync(out('adaptive-icon.png'));
  await icon.clone().resize(48, 48).writeAsync(out('favicon.png'));

  const symbol = await extractSymbol(src);
  await symbol.writeAsync(out('brand/logo-mark.png'));
  await (await centered(symbol, 1024, 0.5)).writeAsync(out('splash-icon.png'));
  console.log('Listo: icon, adaptive-icon, favicon, splash-icon y brand/logo-mark');
})();
