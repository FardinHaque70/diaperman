import { W, H, textStyle, loadBest } from '../config.js';
import { Background } from '../background.js';
import { addButton } from '../ui.js';
import { leaderboardEnabled, fetchTop, getName, askName, submitScore } from '../leaderboard.js';

const ROWS = 10;
const TOP = 250;     // top of the white box
const ROW_H = 46;
const DARK = '#1d3557';

export class LeaderboardScene extends Phaser.Scene {
  constructor() { super('Leaderboard'); }

  create() {
    this.bg = new Background(this);
    this.add.rectangle(W / 2, H / 2, W, H, 0x1d3557, 0.25);
    this.add.text(W / 2, 150, 'LEADERBOARD', textStyle(60, '#ffd166')).setOrigin(0.5);

    const boxH = ROWS * ROW_H + 50;
    const box = this.add.graphics();
    box.fillStyle(0xffffff, 1);
    box.fillRoundedRect(W / 2 - 230, TOP, 460, boxH, 28);
    box.lineStyle(6, 0x1d3557, 1);
    box.strokeRoundedRect(W / 2 - 230, TOP, 460, boxH, 28);

    this.rows = this.add.container(0, 0);
    this.status = this.add.text(W / 2, TOP + boxH / 2, '', { ...this.plain(28), align: 'center' }).setOrigin(0.5);

    // Your name + best, tap to change the name
    this.you = this.add.text(W / 2, TOP + boxH + 45, '', textStyle(24)).setOrigin(0.5);

    addButton(this, W / 2, H - 70, 'BACK', () => this.scene.start('Menu'), { width: 240 });

    if (!leaderboardEnabled()) {
      this.status.setText(`YOUR BEST: ${loadBest() || '—'}\n\nFriends leaderboard\ncoming soon!`);
      return;
    }

    this.refreshYou();
    this.you.setInteractive({ useHandCursor: true });
    this.you.on('pointerup', () => this.changeName());
    this.load();
  }

  plain(size, color = DARK) {
    return { fontFamily: '"Trebuchet MS", Arial, sans-serif', fontSize: `${size}px`, fontStyle: 'bold', color };
  }

  refreshYou() {
    const name = getName();
    this.you.setText(name ? `You: ${name} (${loadBest()})  ✏️ change` : '✏️ Enter your name');
  }

  async load() {
    this.rows.removeAll(true);
    this.status.setText('Loading...');
    const top = await fetchTop(ROWS);
    if (!this.sys.isActive()) return;
    if (!top) { this.status.setText("Couldn't load the leaderboard.\nCheck your connection."); return; }
    this.renderRows(top);
  }

  renderRows(top) {
    this.rows.removeAll(true);
    if (top.length === 0) { this.status.setText('No scores yet.\nBe the first!'); return; }
    this.status.setText('');

    top.forEach((row, i) => {
      const y = TOP + 25 + i * ROW_H + ROW_H / 2;
      if (row.me) this.rows.add(this.add.rectangle(W / 2, y, 430, ROW_H - 6, 0xffd166, 0.6));
      const medal = ['🥇', '🥈', '🥉'][i];
      this.rows.add(this.add.text(W / 2 - 200, y, medal || `${i + 1}.`, this.plain(medal ? 26 : 24, '#457b9d')).setOrigin(0, 0.5));
      this.rows.add(this.add.text(W / 2 - 150, y, row.name, this.plain(26)).setOrigin(0, 0.5));
      this.rows.add(this.add.text(W / 2 + 200, y, String(row.best), this.plain(26, '#e85d04')).setOrigin(1, 0.5));
    });
  }

  async changeName() {
    await askName(this, { title: 'Your name for the leaderboard', current: getName() });
    this.refreshYou();
    this.status.setText('Saving...');
    this.rows.removeAll(true);
    await submitScore(loadBest()); // re-save your best under the new name
    if (this.sys.isActive()) this.load();
  }

  update(_t, delta) {
    this.bg.scroll(120 * delta / 1000);
  }
}
