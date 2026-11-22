import { W, textStyle } from './config.js';
import { isMuted, toggleMute, unlockAudio } from './sfx.js';

// Rounded pill button. Fires on pointerup (a finished tap).
export function addButton(scene, x, y, label, onTap, { width = 320, color = 0x3a86ff } = {}) {
  const bg = scene.add.rectangle(0, 0, width, 70, color).setStrokeStyle(5, 0x1d3557);
  const txt = scene.add.text(0, 0, label, textStyle(30)).setOrigin(0.5);
  const btn = scene.add.container(x, y, [bg, txt]).setDepth(100);
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', () => scene.tweens.add({ targets: btn, scale: 0.94, duration: 70, yoyo: true }));
  bg.on('pointerup', onTap);
  return btn;
}

// Small round icon button (same look as the sound button).
export function addIconButton(scene, x, y, icon, onTap) {
  const bg = scene.add.circle(x, y, 30, 0x1d3557, 0.35).setDepth(100);
  const label = scene.add.text(x, y + 2, icon, { fontSize: '30px' }).setOrigin(0.5).setDepth(101);
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', () => scene.tweens.add({ targets: [bg, label], scale: 0.9, duration: 70, yoyo: true }));
  bg.on('pointerup', onTap);
  return { bg, label };
}

// Speaker button in the top-right corner.
export function addMuteButton(scene) {
  const { bg, label } = addIconButton(scene, W - 44, 44, '', () => {});
  const refresh = () => label.setText(isMuted() ? '🔇' : '🔊');
  refresh();
  bg.off('pointerup');
  bg.on('pointerdown', () => { unlockAudio(); toggleMute(); refresh(); });
  return bg;
}
