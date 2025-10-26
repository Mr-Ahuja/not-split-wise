import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(process.cwd(), 'public');
const logoSvgPath = path.join(root, 'logo.svg');
const outDir = path.join(root, 'icons');
fs.mkdirSync(outDir, { recursive: true });

const svg = fs.readFileSync(logoSvgPath);

const targets = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 512, name: 'icon-512-maskable.png', background: '#0b0f14' }
];

for (const t of targets) {
  const dest = path.join(outDir, t.name);
  const s = sharp(svg).resize(t.size, t.size, { fit: 'contain', background: t.background ?? { r:0, g:0, b:0, alpha:0 } });
  await s.png().toFile(dest);
  console.log('wrote', dest);
}

