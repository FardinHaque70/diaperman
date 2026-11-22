// Packs the whole game into a single dist/index.html (plus engine, icon, manifest,
// preview and the offline service worker).
// Phones cache files for a few minutes; with the game code inside the page they
// always get either the complete old version or the complete new one, never a mix.
//
// Run locally:  npm install --no-save --no-package-lock esbuild@0.24.0 && node scripts/build.mjs
// (GitHub runs this automatically on every push; see .github/workflows/pages.yml)
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, copyFile, cp, rm } from 'node:fs/promises';

const SLOT = '<!-- GAME_CODE: the build puts the packed game here -->';

await rm('dist', { recursive: true, force: true });
await mkdir('dist');

const result = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  minify: true,
  target: 'es2020',
  write: false,
  external: ['https://*'], // Firebase is loaded from Google's CDN when needed
  logLevel: 'warning',
});
// Keep "</script>" inside the code from closing the tag early
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

// The loader in index.html calls __startGame() once the engine has downloaded
const html = await readFile('index.html', 'utf8');
if (!html.includes(SLOT)) throw new Error(`index.html is missing: ${SLOT}`);
const page = html.replace(SLOT, () => `<script>window.__startGame=function(){${js}};</script>`);
await writeFile('dist/index.html', page);

for (const f of ['manifest.webmanifest', 'icon.svg', 'preview.png']) await copyFile(f, `dist/${f}`);
// The game engine, hosted with the game
await cp('vendor', 'dist/vendor', { recursive: true });
// Also publish the separate source files, so a phone that still has an older
// cached page (which loads src/main.js) keeps working instead of hanging.
await cp('src', 'dist/src', { recursive: true });

// Service worker, stamped with this build's id so phones pick up updates
const id = createHash('sha256').update(page).digest('hex').slice(0, 12);
const sw = (await readFile('sw.js', 'utf8')).replace("const VERSION = 'dev';", `const VERSION = '${id}';`);
if (!sw.includes(id)) throw new Error('could not stamp sw.js');
await writeFile('dist/sw.js', sw);

console.log(`Built dist/ (build ${id}, ${Math.round(js.length / 1024)} KB of game code inlined)`);
