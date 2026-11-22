import { W, textStyle } from '../config.js';
import { Background } from '../background.js';
import { addMuteButton, addIconButton } from '../ui.js';
import { unlockAudio, sfx } from '../sfx.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    this.starting = false;
    this.bg = new Background(this);

    // Title
    const title = this.add.container(W / 2, 300);
    title.add(this.add.text(0, -45, 'DIAPER', textStyle(96, '#ffd166')).setOrigin(0.5));
    title.add(this.add.text(0, 50, 'MAN', textStyle(110, '#ef476f')).setOrigin(0.5));
    title.setAngle(-4);
    this.tweens.add({ targets: title, y: 285, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const tap = this.add.text(W / 2, 560, 'TAP TO PLAY', textStyle(50)).setOrigin(0.5);
    this.tweens.add({ targets: tap, scale: 1.1, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // Leaderboard: top-left, opposite the sound button
    addIconButton(this, 44, 44, '🏆', () => {
      this.starting = true;
      unlockAudio();
      this.scene.start('Leaderboard');
    });

    addMuteButton(this);

    this.input.on('pointerdown', (_p, over) => {
      if (over.length) return; // tapped a button
      this.startGame();
    });
    this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
  }

  startGame() {
    if (this.starting) return;
    this.starting = true;
    unlockAudio();
    sfx.start();
    this.cameras.main.fadeOut(200, 255, 255, 255);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game'));
  }

  update(_t, delta) {
    this.bg.scroll(120 * delta / 1000);
  }
}
