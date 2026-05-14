#!/usr/bin/env node
// Sync content з repo root у web/src/content/ — для Vercel deploy
// (Vercel бачить тільки /web, тому контент має жити всередині)

import { cpSync, mkdirSync, rmSync, existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '../..');
const DEST = resolve(__dirname, '../src/content');
const SRC_CHECK = resolve(REPO, 'polozhennia');

// Якщо source не існує (Vercel build environment, наприклад) — exit 0.
// Content уже скопійовано в src/content/ перед deploy.
if (!existsSync(SRC_CHECK)) {
  console.log(`Source ${SRC_CHECK} not present, assuming content/ already populated. Skipping sync.`);
  process.exit(0);
}

// Чистимо стару копію
if (existsSync(DEST)) {
  rmSync(DEST, { recursive: true, force: true });
}
mkdirSync(DEST, { recursive: true });

// Копіюємо
const copies = [
  ['polozhennia', 'polozhennia'],
  ['dodatky', 'dodatky'],
  ['nakaz.md', 'nakaz/nakaz.md'],
  ['meta/amendments.yaml', '_data/amendments.yaml'],
  ['meta/glossary.md', '_data/glossary.md'],
];

for (const [src, dst] of copies) {
  const srcPath = resolve(REPO, src);
  const dstPath = resolve(DEST, dst);
  if (!existsSync(srcPath)) {
    console.warn(`  ⚠ ${src} not found, skipping`);
    continue;
  }
  mkdirSync(dirname(dstPath), { recursive: true });
  cpSync(srcPath, dstPath, { recursive: true });
  console.log(`  → ${src} → src/content/${dst}`);
}

// Strip Jekyll-specific syntax that doesn't render in Astro
function walkAndStrip(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkAndStrip(p);
    else if (p.endsWith('.md')) {
      let text = readFileSync(p, 'utf8');
      const orig = text;
      // Remove {% include ... %} lines
      text = text.replace(/^\s*\{%\s*include\s+[^%]+%\}\s*$/gm, '');
      // Remove Jekyll {% if/for/assign/endif/endfor %} blocks (homepage uses them)
      text = text.replace(/\{%[^%]*%\}/g, '');
      // Remove Liquid expressions {{ ... }}
      text = text.replace(/\{\{[^}]*\}\}/g, '');
      if (text !== orig) writeFileSync(p, text);
    }
  }
}
walkAndStrip(DEST);
console.log('Content synced + Jekyll syntax stripped.');
