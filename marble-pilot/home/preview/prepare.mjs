import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const output = new URL('../../../tmp/marble-preview/vendor/spark.module.js', import.meta.url);
const expectedHash = 'd5c3b3722e4e121836b7d26f1260c2a2750973130adfce0aed97bc312b54ead7';
const officialUrl = 'https://sparkjs.dev/releases/spark/2.2.0/spark.module.js';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
let existing;
try { existing = await readFile(output); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (existing && hash(existing) === expectedHash) {
  console.log('Spark 2.2.0 já preparado e verificado.');
} else {
  const response = await fetch(officialUrl, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Falha no download oficial: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (hash(bytes) !== expectedHash) throw new Error('O módulo recebido difere da versão revisada. Download não salvo.');
  await mkdir(new URL('.', output), { recursive: true });
  await writeFile(output, bytes);
  console.log(`Spark 2.2.0 preparado em ${fileURLToPath(output)}.`);
}
console.log('Copie os SPZ privados já gerados para tmp/marble-preview/ e abra a prévia pelo Vite.');
