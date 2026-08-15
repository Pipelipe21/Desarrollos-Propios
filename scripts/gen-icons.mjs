// Regenerates the PWA icons in public/ from a simple text wordmark.
// Run once with: npm install --no-save sharp && node scripts/gen-icons.mjs
// (sharp isn't a regular dependency — it's only needed when re-generating icons.)
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public');
mkdirSync(OUT_DIR, { recursive: true });

// Flat icon: navy background (matches theme-color), bold white "D&D" wordmark.
const svg = (size, safePad = 0) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0f172a"/>
  <text x="256" y="${290 - safePad}" font-family="Arial, Helvetica, sans-serif" font-weight="700"
        font-size="${190 - safePad * 0.6}" fill="#ffffff" text-anchor="middle">D&amp;D</text>
</svg>`;

const targets = [
  { name: 'icon-192.png', size: 192, safePad: 0 },
  { name: 'icon-512.png', size: 512, safePad: 0 },
  { name: 'icon-maskable-512.png', size: 512, safePad: 60 }, // extra padding for maskable safe zone
  { name: 'apple-touch-icon.png', size: 180, safePad: 0 },
];

for (const t of targets) {
  await sharp(Buffer.from(svg(t.size, t.safePad)))
    .resize(t.size, t.size)
    .png()
    .toFile(join(OUT_DIR, t.name));
  console.log(`Generated ${t.name}`);
}

await sharp(Buffer.from(svg(64)))
  .resize(64, 64)
  .png()
  .toFile(join(OUT_DIR, 'favicon.png'));
console.log('Generated favicon.png');
