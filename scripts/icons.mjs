// Generates the PNG app icons from public/icon.svg. Run once after changing the icon: npm run icons
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const svg = await readFile('public/icon.svg');
const BG = '#f7f3ec';

async function icon(size, file, { padding = 0.1, background = BG } = {}) {
  const inner = Math.round(size * (1 - padding * 2));
  const art = await sharp(svg, { density: 512 }).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: art, gravity: 'center' }])
    .png()
    .toFile(`public/${file}`);
  console.log('wrote', file);
}

await icon(192, 'icon-192.png');
await icon(512, 'icon-512.png');
// Maskable: keep the art inside the 80% safe zone.
await icon(512, 'icon-maskable-512.png', { padding: 0.2 });
await icon(180, 'apple-touch-icon.png', { padding: 0.12 });
