// Builds the slim Phaser engine used by the game:
//   npm install --no-save --no-package-lock esbuild@0.24.0 phaser@3.80.1
//   node scripts/build-phaser.mjs
// Output: vendor/phaser-diaperman-3.80.1.min.js (committed, so it only needs
// rebuilding if the game starts using a Phaser feature that isn't included).
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

// Phaser's own builds switch features on/off with "typeof FLAG" checks.
const FLAGS = {
  CANVAS_RENDERER: true,   // needed: textures are drawn on canvas at startup
  WEBGL_RENDERER: true,
  WEBGL_DEBUG: false,
  EXPERIMENTAL: false,
  PLUGIN_3D: false,
  PLUGIN_CAMERA3D: false,
  PLUGIN_FBINSTANT: false,
  FEATURE_SOUND: false,    // the game makes its own sounds with Web Audio
};

const phaserFlags = {
  name: 'phaser-flags',
  setup(b) {
    b.onLoad({ filter: /[\\/]phaser[\\/]src[\\/].*\.js$/ }, async (args) => {
      let code = await readFile(args.path, 'utf8');
      for (const [flag, on] of Object.entries(FLAGS)) {
        code = code.replace(new RegExp(`typeof\\s+${flag}\\b`, 'g'), on ? '"boolean"' : 'false');
      }
      return { contents: code, loader: 'js' };
    });
  },
};

await build({
  entryPoints: ['scripts/phaser-custom.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2017',
  outfile: 'vendor/phaser-diaperman-3.80.1.min.js',
  define: { global: 'window' },
  plugins: [phaserFlags],
  legalComments: 'none',
  banner: { js: '/* Phaser v3.80.1 (MIT, Photon Storm Ltd) - custom DiaperMan build */' },
  logLevel: 'warning',
});
console.log('Built vendor/phaser-diaperman-3.80.1.min.js');
