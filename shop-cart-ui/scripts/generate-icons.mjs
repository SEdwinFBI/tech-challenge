import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const BRAND = { r: 14, g: 124, b: 102, alpha: 1 };
const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const outDir = fileURLToPath(new URL('../public/brand/', import.meta.url));
await mkdir(outDir, { recursive: true });

const WHITE_MIN = 236;

const loadRaw = async (file) => {
  const { data, info } = await sharp(publicDir + file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
};

const outsideMask = ({ data, width, height }) => {
  const isWhite = (p) => data[p * 4] >= WHITE_MIN && data[p * 4 + 1] >= WHITE_MIN && data[p * 4 + 2] >= WHITE_MIN;
  const outside = new Uint8Array(width * height);
  const stack = [];
  const push = (p) => {
    if (!outside[p] && isWhite(p)) {
      outside[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (stack.length) {
    const p = stack.pop();
    const x = p % width;
    if (x > 0) push(p - 1);
    if (x < width - 1) push(p + 1);
    if (p >= width) push(p - width);
    if (p < width * (height - 1)) push(p + width);
  }
  return outside;
};

const erode = (alpha, width, height, times) => {
  let cur = alpha;
  for (let t = 0; t < times; t++) {
    const next = new Uint8Array(cur);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const p = y * width + x;
        if (!cur[p]) continue;
        if (!cur[p - 1] || !cur[p + 1] || !cur[p - width] || !cur[p + width]) next[p] = 0;
      }
    }
    cur = next;
  }
  return cur;
};

const cutOutside = async (file, erosion) => {
  const raw = await loadRaw(file);
  const { data, width, height } = raw;
  const outside = outsideMask(raw);
  const inside = new Uint8Array(width * height);
  for (let i = 0; i < inside.length; i++) inside[i] = outside[i] ? 0 : 1;
  const eroded = erode(inside, width, height, erosion);
  const alpha = await sharp(Buffer.from(eroded.map((v) => v * 255)), { raw: { width, height, channels: 1 } })
    .blur(0.8)
    .extractChannel(0)
    .raw()
    .toBuffer();
  const out = Buffer.from(data);
  for (let i = 0; i < width * height; i++) out[i * 4 + 3] = alpha[i];
  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
};

const trimmed = async (buffer) => sharp(buffer).trim({ threshold: 1, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

const save = async (pipeline, name) => {
  await pipeline.toFile(outDir + name);
};

const squareContain = (buffer, size) =>
  sharp(buffer).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' });

const iconCut = await cutOutside('shopCart-icon.png', 2);
const tile = await trimmed(iconCut);
const tileMeta = await sharp(tile).metadata();
const tileSquare = await sharp(tile)
  .resize(Math.max(tileMeta.width, tileMeta.height), Math.max(tileMeta.width, tileMeta.height), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const favicons = {};
for (const size of [32, 48]) {
  favicons[size] = await squareContain(tileSquare, size).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(outDir + `favicon-${size}.png`, favicons[size]);
}

const ico = (images) => {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, buffer }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(size, e);
    header.writeUInt8(size, e + 1);
    header.writeUInt8(0, e + 2);
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(buffer.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += buffer.length;
  });
  return Buffer.concat([header, ...images.map((i) => i.buffer)]);
};
await writeFile(
  publicDir + 'favicon.ico',
  ico([
    { size: 32, buffer: favicons[32] },
    { size: 48, buffer: favicons[48] },
  ]),
);

await save(
  squareContain(tileSquare, 180).flatten({ background: BRAND }).png({ compressionLevel: 9, palette: true, quality: 90 }),
  'apple-touch-icon.png',
);
await save(squareContain(tileSquare, 192).png({ compressionLevel: 9, palette: true, quality: 90 }), 'pwa-192.png');
await save(squareContain(tileSquare, 512).png({ compressionLevel: 9, palette: true, quality: 90 }), 'pwa-512.png');
await save(squareContain(tileSquare, 96).webp({ quality: 88, effort: 6 }), 'shopcart-icon-96.webp');
await save(squareContain(tileSquare, 96).png({ compressionLevel: 9, palette: true, quality: 90 }), 'shopcart-icon-96.png');

const maskSize = 512;
const crop = { left: 100, top: 80, width: 1040, height: 1090 };
const scale = (maskSize * 0.9) / crop.height;
const cw = Math.round(crop.width * scale);
const ch = Math.round(crop.height * scale);
const art = await sharp(iconCut).extract(crop).resize(cw, ch, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
const ramp = (d, f) => Math.min(1, d / f);
const feather = Math.round(maskSize * 0.035);
const featheredArt = Buffer.from(art);
for (let y = 0; y < ch; y++) {
  for (let x = 0; x < cw; x++) {
    const t = Math.min(ramp(x, feather), ramp(cw - 1 - x, feather), ramp(y, feather), ramp(ch - 1 - y, feather));
    const smooth = t * t * (3 - 2 * t);
    const i = (y * cw + x) * 4 + 3;
    featheredArt[i] = Math.round(featheredArt[i] * smooth);
  }
}
const featheredPng = await sharp(featheredArt, { raw: { width: cw, height: ch, channels: 4 } }).png().toBuffer();
await save(
  sharp({ create: { width: maskSize, height: maskSize, channels: 4, background: BRAND } })
    .composite([{ input: featheredPng, left: Math.round((maskSize - cw) / 2), top: Math.round((maskSize - ch) / 2) }])
    .flatten({ background: BRAND })
    .png({ compressionLevel: 9, palette: true, quality: 90 }),
  'pwa-maskable-512.png',
);

const logo = await trimmed(await cutOutside('shopCart.png', 1));
await save(sharp(logo).resize({ width: 512, kernel: 'lanczos3' }).webp({ quality: 84, effort: 6, alphaQuality: 90 }), 'logo-full.webp');
await save(sharp(logo).resize({ width: 512, kernel: 'lanczos3' }).png({ compressionLevel: 9, palette: true, quality: 85, effort: 10 }), 'logo-full.png');

const stripWordmark = async (buffer) => {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const label = new Int32Array(width * height);
  const keep = new Uint8Array(width * height);
  let next = 0;
  for (let start = 0; start < width * height; start++) {
    if (label[start] || data[start * 4 + 3] < 40) continue;
    next++;
    const stack = [start];
    label[start] = next;
    let top = height;
    const members = [];
    while (stack.length) {
      const p = stack.pop();
      members.push(p);
      const y = Math.floor(p / width);
      if (y < top) top = y;
      const x = p - y * width;
      const around = [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, y > 0 ? p - width : -1, y < height - 1 ? p + width : -1];
      for (const q of around) {
        if (q >= 0 && !label[q] && data[q * 4 + 3] >= 40) {
          label[q] = next;
          stack.push(q);
        }
      }
    }
    if (top < height * 0.6) for (const p of members) keep[p] = 1;
  }
  const out = Buffer.from(data);
  for (let p = 0; p < width * height; p++) if (!keep[p]) out[p * 4 + 3] = 0;
  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
};

const mascot = await trimmed(await stripWordmark(logo));
await save(sharp(mascot).resize({ height: 256, kernel: 'lanczos3' }).webp({ quality: 86, effort: 6, alphaQuality: 90 }), 'logo-mascot.webp');
await save(sharp(mascot).resize({ height: 256, kernel: 'lanczos3' }).png({ compressionLevel: 9, palette: true, quality: 85, effort: 10 }), 'logo-mascot.png');

console.log('brand assets generated');
