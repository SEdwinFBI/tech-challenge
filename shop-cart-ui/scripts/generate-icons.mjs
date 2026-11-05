import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const BRAND = '#0e7c66';
const out = new URL('../public/', import.meta.url);
await mkdir(out, { recursive: true });

const svg = (size, radius, scale) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BRAND}"/>
  <text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${Math.round(size * scale)}" fill="#ffffff">SC</text>
</svg>`;

const targets = [
  ['pwa-192.png', 192, Math.round(192 * 0.22), 0.4],
  ['pwa-512.png', 512, Math.round(512 * 0.22), 0.4],
  ['pwa-maskable-512.png', 512, 0, 0.3],
  ['apple-touch-icon.png', 180, 0, 0.38],
];

for (const [name, size, radius, scale] of targets) {
  await sharp(Buffer.from(svg(size, radius, scale))).png().toFile(new URL(name, out).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
}
