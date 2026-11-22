import { W, H, GRAVITY } from './config.js';
import { makeTextures } from './art.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { LeaderboardScene } from './scenes/LeaderboardScene.js';

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    makeTextures(this);
    document.getElementById('loading')?.remove();
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
    width: W,
    height: H,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: GRAVITY }, debug: false },
  },
  input: { activePointers: 2 },
  scene: [BootScene, MenuScene, GameScene, LeaderboardScene],
});
