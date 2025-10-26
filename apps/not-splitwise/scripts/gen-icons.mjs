import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(process.cwd(), 'public');
const logoSvgPath = path.join(root, 'logo.svg');
const outDir = path.join(root, 'icons');
fs.mkdirSync(outDir, { recursive: true });

const svg = fs.readFileSync(logoSvgPath);

async function makeIcon(size, name, { scale = 0.72, background = '#0b0f14' } = {}) {
  const dest = path.join(outDir, name);
  const bg = sharp({
    create: { width: size, height: size, channels: 4, background }
  });
  const logoBuf = await sharp(svg)
    .resize(Math.round(size * scale), Math.round(size * scale), { fit: 'contain' })
    .png()
    .toBuffer();
  await bg
    .composite([{ input: logoBuf, gravity: 'center' }])
    .png()
    .toFile(dest);
  console.log('wrote', dest);
}

await makeIcon(192, 'icon-192.png');
await makeIcon(512, 'icon-512.png');
await makeIcon(512, 'icon-512-maskable.png', { scale: 0.8 });
await makeIcon(180, 'apple-touch-icon-180.png');
