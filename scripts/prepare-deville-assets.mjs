import { mkdir, copyFile } from 'node:fs/promises';
import sharp from 'sharp';
import { resolve } from 'node:path';

// One-time local preparation. Runtime and production builds do not need source paths.
const source = process.argv[2];
const hero = process.argv[3];
if (!source || !hero) throw new Error('Provide the source image directory and approved clean hero path.');
const output = resolve('public/assets/developments/moradas-da-serra');
await mkdir(output, { recursive: true });
const files = { 'front.jpg': '14.05.25', 'facade.jpg': '14.05.12', 'court.jpg': '14.05.20', 'pool.jpg': '14.05.16', 'lounge.jpg': '14.05.22', 'living.jpg': '14.05.21', 'kitchen.jpg': '14.05.19', 'suite.jpg': '14.05.14', 'bedroom.jpg': '14.05.11', 'single-bedroom.jpg': '14.05.11.', 'bathroom.jpg': '14.05.19.', 'plans.jpg': '14.05.13.' };
for (const [name, time] of Object.entries(files)) await copyFile(resolve(source, `WhatsApp Image 2026-08-21 at ${time}.jpeg`), resolve(output, name));
await sharp(hero).webp({ quality: 91, effort: 6 }).toFile(resolve(output, 'hero.webp'));
console.log('Prepared 12 developer reference images and the conceptual presentation asset.');
