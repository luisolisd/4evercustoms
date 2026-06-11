// Genera los assets de la app (icono, icono adaptativo, splash) desde los logos.
// Uso: node scripts/generate-assets.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');
const SRC_COLOR = path.join(__dirname, '..', '..', 'logotipos', 'color.png');
const SRC_NEGRO = path.join(__dirname, '..', '..', 'logotipos', 'negro.png');

fs.mkdirSync(ASSETS, { recursive: true });

async function square(logoSrc, { size = 1024, logoWidth, bg, out, negate = false }) {
  let logo = sharp(logoSrc);
  if (negate) logo = logo.negate({ alpha: false }); // negro -> blanco, conserva transparencia
  const logoBuf = await logo.resize({ width: logoWidth }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: logoBuf, gravity: 'center' }])
    .png()
    .toFile(out);
  console.log('✓', path.basename(out));
}

(async () => {
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  // Icono de la app: logo a color sobre blanco
  await square(SRC_COLOR, { logoWidth: 900, bg: '#ffffff', out: path.join(ASSETS, 'icon.png') });
  // Icono adaptativo (Android): logo dentro de la zona segura; el fondo va en app.json
  await square(SRC_COLOR, { logoWidth: 640, bg: transparent, out: path.join(ASSETS, 'adaptive-icon.png') });
  // Splash: logo en blanco (para fondo oscuro #111827, definido en app.json)
  await square(SRC_NEGRO, { size: 1242, logoWidth: 1040, bg: transparent, negate: true, out: path.join(ASSETS, 'splash.png') });
  console.log('Listo.');
})();
