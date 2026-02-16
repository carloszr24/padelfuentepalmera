#!/usr/bin/env node
/**
 * Genera favicon.ico, favicon-16x16.png, favicon-32x32.png y apple-touch-icon.png
 * desde public/logo.png. Convierte fondo negro a transparente.
 * Ejecutar: node scripts/generate-favicons.mjs
 */
import sharp from 'sharp';
import toIco from 'to-ico';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');
const logoPath = join(publicDir, 'logo.png');

const BLACK_THRESHOLD = 35; // pixels with R,G,B below this become transparent

/** Convierte fondo negro/near-black a transparente y devuelve sharp instance. */
async function logoWithTransparentBg() {
  const { data, info } = await sharp(logoPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r <= BLACK_THRESHOLD && g <= BLACK_THRESHOLD && b <= BLACK_THRESHOLD) {
      data[i + 3] = 0;
    }
  }
  return sharp(new Uint8Array(data), {
    raw: { width, height, channels },
  }).png();
}

async function main() {
  const base = await logoWithTransparentBg();
  const sizes = [
    { size: 16, name: 'favicon-16x16.png' },
    { size: 32, name: 'favicon-32x32.png' },
    { size: 180, name: 'apple-touch-icon.png' },
  ];

  for (const { size, name } of sizes) {
    const buf = await base.clone().resize(size, size).toBuffer();
    writeFileSync(join(publicDir, name), buf);
    console.log('Created', name);
  }

  const png16 = await base.clone().resize(16, 16).toBuffer();
  const png32 = await base.clone().resize(32, 32).toBuffer();
  const ico = await toIco([png16, png32]);
  writeFileSync(join(publicDir, 'favicon.ico'), ico);
  console.log('Created favicon.ico');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
