// Packs the whole game into a single dist/index.html (plus icon, manifest, preview).
// Phones cache files for a few minutes; with everything in one page they always
// get either the complete old version or the complete new one, never a mix.
//
// Run locally:  npx -y esbuild@0.24.0 --version && node scripts/build.mjs
// (GitHub runs this automatically on every push; see .github/workflows/pages.yml)
import { build } from 'esbuild';
import { readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';

const ENTRY_TAG = '<script type="module" src="src/main.js"></script>';

await rm('dist', { recursive: true, force: true });
await mkdir('dist');

const result = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  minify: true,
  target: 'es2020',
  write: false,
  external: ['https://*'], // Firebase is loaded from Google's CDN at runtime
  logLevel: 'warning',
});
// Keep "</script>" inside the code from closing the tag early
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const html = await readFile('index.html', 'utf8');
if (!html.includes(ENTRY_TAG)) throw new Error(`index.html is missing: ${ENTRY_TAG}`);
await writeFile('dist/index.html', html.replace(ENTRY_TAG, () => `<script>${js}</script>`));

for (const f of ['manifest.webmanifest', 'icon.svg', 'preview.png']) await copyFile(f, `dist/${f}`);

console.log(`Built dist/index.html (${Math.round(js.length / 1024)} KB of game code inlined)`);
