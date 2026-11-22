import { W, H, GROUND_Y } from './config.js';

// Parallax scrolling backdrop shared by the menu and the game.
export class Background {
  constructor(scene) {
    const sky = scene.add.graphics();
    sky.fillGradientStyle(0x6ec6ff, 0x6ec6ff, 0xe0f4ff, 0xe0f4ff, 1);
    sky.fillRect(0, 0, W, H);
    scene.add.circle(440, 140, 50, 0xfff3a0);
    scene.add.circle(440, 140, 70, 0xfff3a0, 0.25);

    this.clouds = scene.add.tileSprite(0, 70, W, 300, 'clouds').setOrigin(0, 0);
    this.hills = scene.add.tileSprite(0, GROUND_Y - 195, W, 200, 'hills').setOrigin(0, 0);
    this.ground = scene.add.tileSprite(0, GROUND_Y - 12, W, H - GROUND_Y + 12, 'ground').setOrigin(0, 0);
  }

  scroll(px) {
    this.clouds.tilePositionX += px * 0.08;
    this.hills.tilePositionX += px * 0.3;
    this.ground.tilePositionX += px;
  }
}
