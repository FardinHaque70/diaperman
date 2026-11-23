import { W, H, GRAVITY, RES } from './config.js';
import { makeTextures } from './art.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { LeaderboardScene } from './scenes/LeaderboardScene.js';
import { startFpsMeter } from './fps.js';

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    makeTextures(this);
    // Fade out the loading screen (older cached pages just have a plain one)
    if (window.__hideLoader) window.__hideLoader();
    else document.getElementById('loading')?.remove();
    this.scene.start('Menu');
  }
}

window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#6ec6ff',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: W * RES,   // drawn at RES x detail; each scene's camera zooms by RES
    height: H * RES,
  },
  physics: {
    default: 'arcade',
    // fixedStep off: physics moves by the real frame time, in sync with the
    // scrolling background. Fixed 1/60s steps judder on phones when frames
    // arrive slightly unevenly (some frames get 2 steps, some get 0).
    arcade: { gravity: { y: GRAVITY }, debug: false, fixedStep: false },
  },
  render: { powerPreference: 'high-performance', antialias: true },
  input: { activePointers: 2 },
  scene: [BootScene, MenuScene, GameScene, LeaderboardScene],
});

// Add ?fps to the link to show a frame-rate meter (for testing on phones)
if (new URLSearchParams(location.search).has('fps')) startFpsMeter();
