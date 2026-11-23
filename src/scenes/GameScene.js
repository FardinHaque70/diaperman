import {
  W, H, GROUND_Y, RES, S, textStyle, loadBest, saveBest,
  JUMP_VELOCITY, DOUBLE_JUMP_VELOCITY, START_SPEED, MAX_SPEED, SPEED_GAIN,
  STAGE_NAMES, MAX_STAGE, DIAPER_POINTS, DIAPER_POINTS_MAXED,
  UNLOCK_TALL_TOWERS, UNLOCK_BEES, UNLOCK_WIDE_TOWERS, GAP_MIN, GAP_MAX, GAP_SQUEEZE_MAX, GAP_SQUEEZE_TIME,
  POWERUP_FIRST, POWERUP_EVERY, GOLDEN_DIAPER_CHANCE, ROCKET_TIME, ROCKET_SPEED_MUL,
  EVENT_FIRST, EVENT_EVERY, VACUUM_UNLOCK, VACUUM_CHANCE, VACUUM_TIME, VACUUM_SPEED_MUL, VACUUM_ESCAPE_POINTS,
} from '../config.js';
import { heroKey } from '../art.js';
import { Background } from '../background.js';
import { addMuteButton, fitCamera } from '../ui.js';
import { unlockAudio, sfx } from '../sfx.js';
import { leaderboardEnabled, getName, askName, submitScore, fetchTop, cachedTop } from '../leaderboard.js';

const SPAWN_X = W + 80;
const BLOCKS = ['blockRed', 'blockBlue', 'blockGreen'];
const HERO_X = 130;
const BLOWOUT_VELOCITY = -1350;
const BLOWOUT_FLOAT_GRAVITY = -1500; // added to world gravity while floating down

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    fitCamera(this);
    this.cameras.main.fadeIn(200, 255, 255, 255);
    this.bg = new Background(this);

    this.speed = START_SPEED;
    this.speedMul = 1;         // temporary boost (rocket / vacuum chase)
    this.distance = 0;
    this.bonus = 0;
    this.score = 0;
    this.best = loadBest();
    this.isOver = false;
    this.restarting = false;
    this.popPool = {};         // reusable floating texts
    this.dustPool = [];        // reusable vacuum dust specks
    this.namePrompt = false;
    this.jumps = 0;
    this.spawnTimer = 2.0;
    this.elapsed = 0;          // seconds survived this run (drives difficulty)
    this.stage = 0;            // outfit stage: 0 = naked, MAX_STAGE = full DiaperMan
    this.diaperDue = 2.2;      // seconds until the next diaper is placed
    this.powerupDue = POWERUP_FIRST;
    this.eventDue = EVENT_FIRST;
    this.pendingEvent = null;
    this.lastEvent = null;
    this.invulnerable = false; // brief safety window after losing a piece
    this.mouthTimer = 0;       // > 0 while blubbing
    this.rocket = 0;           // seconds of rocket flight left
    this.rocketT = 0;
    this.blowout = null;       // { t } while launched by a blowout
    this.vac = null;           // vacuum chase state
    this.physics.resume();     // in case the last run ended paused

    // Invisible floor
    const floor = this.add.rectangle(W / 2, GROUND_Y + 50, W * 2, 100);
    this.physics.add.existing(floor, true);

    // Hero (one run animation per outfit stage)
    for (let s = 0; s <= MAX_STAGE; s++) {
      if (!this.anims.exists(`run${s}`)) {
        this.anims.create({ key: `run${s}`, frames: [{ key: heroKey(s, 0) }, { key: heroKey(s, 1) }], frameRate: 10, repeat: -1 });
      }
    }
    this.player = this.physics.add.sprite(HERO_X, GROUND_Y - 46, heroKey(0, 0)).setDepth(10).setScale(S(1));
    // Hitbox sizes are in texture pixels (RES x), so they match at any detail level
    this.player.body.setSize(30 * RES, 56 * RES).setOffset(27 * RES, 34 * RES);
    this.physics.add.collider(this.player, floor);

    // Obstacles + collectibles
    this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });
    this.bottles = this.physics.add.group({ allowGravity: false });
    this.diapers = this.physics.add.group({ allowGravity: false });
    this.powerups = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.player, this.obstacles, (_p, o) => this.hit(o));
    this.physics.add.overlap(this.player, this.bottles, (_p, b) => this.collect(b));
    this.physics.add.overlap(this.player, this.diapers, (_p, d) => this.collectDiaper(d));
    this.physics.add.overlap(this.player, this.powerups, (_p, u) => this.collectPowerup(u));
    this.mouth = this.add.image(0, 0, 'mouthO').setDepth(11).setVisible(false).setScale(S(1));

    // Effects
    this.dust = this.add.particles(0, 0, 'dust', {
      speed: { min: 40, max: 140 }, angle: { min: 190, max: 260 }, lifespan: 380,
      scale: { start: S(1), end: 0 }, alpha: { start: 0.9, end: 0 }, emitting: false,
    }).setDepth(9);
    this.sparks = this.add.particles(0, 0, 'spark', {
      speed: { min: 80, max: 260 }, lifespan: 500, scale: { start: S(1.3), end: 0 },
      rotate: { min: 0, max: 360 }, emitting: false,
    }).setDepth(11);
    // Golden sparkle trail once fully suited up
    this.trail = this.add.particles(0, 0, 'spark', {
      speed: { min: 20, max: 70 }, angle: { min: 150, max: 210 }, lifespan: 500,
      scale: { start: S(1), end: 0 }, alpha: { start: 1, end: 0 }, frequency: 45, emitting: false,
    }).setDepth(9);
    this.trail.startFollow(this.player, -18, 8);
    // Rocket: sippy cup on his back + flames
    this.jetpack = this.add.image(0, 0, 'jetpack').setDepth(9).setVisible(false).setScale(S(1));
    this.flames = this.add.particles(0, 0, 'flame', {
      speed: { min: 140, max: 260 }, angle: { min: 150, max: 200 }, lifespan: 280,
      scale: { start: S(1.2), end: 0 }, alpha: { start: 1, end: 0 }, frequency: 14, emitting: false,
    }).setDepth(8);
    this.stink = this.add.particles(0, 0, 'stink', {
      speed: { min: 60, max: 220 }, angle: { min: 20, max: 160 }, lifespan: 900,
      scale: { start: S(0.8), end: S(2.2) }, alpha: { start: 0.9, end: 0 }, emitting: false,
    }).setDepth(9);

    // HUD
    this.scoreText = this.add.text(24, 20, '0', textStyle(54)).setDepth(100);
    this.add.text(26, 88, `BEST ${this.best}`, textStyle(22, '#ffd166')).setDepth(100);
    // Suit progress: one pip per diaper piece
    this.pips = [];
    for (let i = 0; i < MAX_STAGE; i++) {
      this.pips.push(this.add.image(40 + i * 30, 140, 'diaperItem').setScale(S(0.55)).setAlpha(0.3).setDepth(100));
    }
    this.meter = this.add.graphics().setDepth(100); // rocket / vacuum timer bar
    this.meterLabel = this.add.text(W / 2, 196, '', textStyle(20)).setOrigin(0.5).setDepth(100);
    addMuteButton(this);

    // Controls: tap anywhere (or Space / Up on a keyboard)
    this.input.on('pointerdown', (_p, over) => { if (!over.length) this.jump(); });
    this.input.on('pointerup', () => this.releaseJump());
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => this.jump());
      this.input.keyboard.on('keydown-UP', () => this.jump());
      this.input.keyboard.on('keyup-SPACE', () => this.releaseJump());
      this.input.keyboard.on('keyup-UP', () => this.releaseJump());
    }
  }

  // ---------------------------------------------------------------- controls
  onGround() {
    // Check the floor itself: picking up items mid-air also sets "touching"
    const b = this.player.body;
    return b.bottom >= GROUND_Y - 2 && b.velocity.y >= 0;
  }

  jump() {
    if (this.isOver) return;
    unlockAudio();
    if (this.rocket > 0 || this.blowout) return; // flying: nothing to do
    if (this.onGround()) {
      this.player.setVelocityY(JUMP_VELOCITY);
      this.jumps = 1;
      this.dust.explode(8, this.player.x - 6, GROUND_Y);
      sfx.jump();
    } else if (this.jumps < 2) {
      this.player.setVelocityY(DOUBLE_JUMP_VELOCITY);
      this.jumps = 2;
      this.dust.explode(6, this.player.x, this.player.y + 30);
      this.tweens.add({ targets: this.player, angle: -360, duration: 420, onComplete: () => this.player.setAngle(0) });
      this.blub();
    }
  }

  // Toothless raspberry on every double jump: puffed "O" mouth,
  // a few spit bubbles floating off and a "blub-blub" sound. Just for fun.
  blub() {
    this.mouthTimer = 0.35;
    sfx.blub();
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 55, () => {
        if (this.isOver) return;
        const m = this.mouthPos();
        const b = this.add.image(m.x + 4, m.y, 'spit').setScale(S(0.4)).setDepth(12);
        this.tweens.add({
          targets: b,
          x: b.x - Phaser.Math.Between(50, 170),
          y: b.y - Phaser.Math.Between(30, 140),
          scale: S(Phaser.Math.FloatBetween(0.9, 1.5)),
          duration: Phaser.Math.Between(450, 800),
          ease: 'Sine.out',
          onComplete: () => {
            if (i % 2 === 0) sfx.pop();
            this.tweens.add({ targets: b, scale: b.scale * 1.5, alpha: 0, duration: 90, onComplete: () => b.destroy() });
          },
        });
      });
    }
    // a drool drop or two
    const m = this.mouthPos();
    this.dust.explode(2, m.x, m.y);
  }

  // Where the hero's mouth is, following his spin
  mouthPos() {
    const p = this.player;
    const ox = 9, oy = -6, r = p.rotation;
    return { x: p.x + ox * Math.cos(r) - oy * Math.sin(r), y: p.y + ox * Math.sin(r) + oy * Math.cos(r) };
  }

  // Short tap = small hop, hold = full jump
  releaseJump() {
    if (this.isOver || this.rocket > 0 || this.blowout) return;
    if (this.player.body.velocity.y < -380) {
      this.player.setVelocityY(this.player.body.velocity.y * 0.55);
    }
  }

  // ---------------------------------------------------------------- spawning
  worldSpeed() { return this.speed * this.speedMul; }

  spawn() {
    const sec = this.elapsed;
    const roll = Math.random();
    const giveDiaper = this.diaperDue <= 0;
    let width = 60; // how far the pattern extends to the right

    if (sec > UNLOCK_BEES && roll < 0.25) {
      // Bee: low (must jump) or high (stay on the ground)
      const low = Math.random() < 0.5;
      const bee = this.obstacles.create(SPAWN_X, low ? GROUND_Y - 42 : GROUND_Y - 200, 'bee').setScale(S(1));
      bee.body.setSize(40 * RES, 26 * RES).setOffset(8 * RES, 18 * RES);
      this.tweens.add({ targets: bee, y: bee.y - 14, duration: 350, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      if (giveDiaper) this.addDiaper(SPAWN_X, low ? GROUND_Y - 190 : GROUND_Y - 55);
      else if (!low) this.addBottles(SPAWN_X, GROUND_Y - 60, 1);
    } else if (roll < 0.5) {
      const duck = this.obstacles.create(SPAWN_X, GROUND_Y - 29, 'duck').setScale(S(1));
      duck.body.setSize(46 * RES, 34 * RES).setOffset(8 * RES, 22 * RES);
      this.tweens.add({ targets: duck, angle: { from: -6, to: 6 }, duration: 260, yoyo: true, repeat: -1 });
      if (giveDiaper) this.addDiaper(SPAWN_X, GROUND_Y - 180);
    } else {
      // Toy-block tower: 1-2 high, sometimes two towers side by side
      const tall = sec > UNLOCK_TALL_TOWERS && Math.random() < 0.4 ? 2 : 1;
      const wide = sec > UNLOCK_WIDE_TOWERS && Math.random() < 0.3 ? 2 : 1;
      for (let c = 0; c < wide; c++) {
        for (let r = 0; r < tall; r++) {
          const blk = this.obstacles.create(SPAWN_X + c * 54, GROUND_Y - 28 - r * 54, Phaser.Utils.Array.GetRandom(BLOCKS)).setScale(S(1));
          blk.body.setSize(46 * RES, 50 * RES).setOffset(5 * RES, 4 * RES);
        }
      }
      width = wide * 54;
      if (giveDiaper) this.addDiaper(SPAWN_X + (wide - 1) * 27, GROUND_Y - 140 - tall * 54);
      else if (Math.random() < 0.6) this.addBottles(SPAWN_X + width / 2 - 25, GROUND_Y - 120 - tall * 54, 3, true);
    }

    // Power-up floats in the gap after this obstacle
    if (this.powerupDue <= 0 && this.rocket <= 0) {
      const golden = Math.random() < GOLDEN_DIAPER_CHANCE;
      this.addPowerup(SPAWN_X + width + 200, GROUND_Y - 150, golden ? 'goldDiaper' : 'cupItem');
      this.powerupDue = Phaser.Math.FloatBetween(POWERUP_EVERY[0], POWERUP_EVERY[1]);
    } else if (Math.random() < 0.25) {
      this.addBottles(SPAWN_X + width + 160, GROUND_Y - 50, 3);
    }

    if (giveDiaper) {
      this.diaperDue = this.stage >= MAX_STAGE
        ? Phaser.Math.FloatBetween(8, 12)  // bonus diapers after the suit is complete
        : Phaser.Math.FloatBetween(5, 8);
    }

    // Next spawn: gaps shrink a little as you go
    const squeeze = GAP_SQUEEZE_MAX * Math.min(1, sec / GAP_SQUEEZE_TIME);
    this.spawnTimer = Phaser.Math.FloatBetween(GAP_MIN, GAP_MAX) - squeeze + width / this.speed;
  }

  addBottles(x, y, count, arc = false) {
    for (let i = 0; i < count; i++) {
      const dy = arc ? -Math.sin((i / Math.max(1, count - 1)) * Math.PI) * 40 : 0;
      const b = this.bottles.create(x + i * 50, y + dy, 'bottle').setScale(S(1));
      this.tweens.add({ targets: b, scale: S(1.12), duration: 300, yoyo: true, repeat: -1 });
    }
  }

  addDiaper(x, y) {
    const d = this.diapers.create(x, y, 'diaperItem').setScale(S(1));
    d.body.setSize(40 * RES, 32 * RES);
    this.tweens.add({ targets: d, y: y - 10, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: d, angle: { from: -10, to: 10 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  addPowerup(x, y, key) {
    const u = this.powerups.create(x, y, key).setScale(S(key === 'goldDiaper' ? 1.4 : 1));
    u.body.setSize(40 * RES, 40 * RES);
    this.tweens.add({ targets: u, y: y - 14, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: u, angle: { from: -12, to: 12 }, duration: 380, yoyo: true, repeat: -1 });
  }

  // Floating "+5" style text. Reuses finished ones with the same look, so the
  // phone doesn't redraw and re-upload a new text image for every pickup.
  popText(x, y, msg, color = '#ffd166', size = 30) {
    const key = `${msg}|${color}|${size}`;
    const pool = (this.popPool[key] ||= []);
    const t = pool.pop() || this.add.text(0, 0, msg, textStyle(size, color)).setOrigin(0.5).setDepth(50);
    t.setPosition(x, y).setAlpha(1).setVisible(true);
    this.tweens.add({
      targets: t, y: y - 60, alpha: 0, duration: 650,
      onComplete: () => { t.setVisible(false); pool.push(t); },
    });
  }

  banner(msg, color = '#ffffff', size = 44, hold = 800, y = 300) {
    const b = this.add.text(W / 2, y, msg, textStyle(size, color)).setOrigin(0.5).setDepth(150).setScale(0.3);
    this.tweens.add({ targets: b, scale: 1, duration: 260, ease: 'Back.out' });
    this.tweens.add({ targets: b, alpha: 0, y: y - 40, delay: hold, duration: 350, onComplete: () => b.destroy() });
  }

  collect(bottle) {
    if (this.isOver) return;
    this.sparks.explode(10, bottle.x, bottle.y);
    this.popText(bottle.x, bottle.y - 20, '+5');
    bottle.destroy();
    this.bonus += 5;
    sfx.pickup();
  }

  collectDiaper(diaper) {
    if (this.isOver) return;
    const { x, y } = diaper;
    diaper.destroy();
    this.sparks.explode(18, x, y);

    if (this.stage >= MAX_STAGE) {
      this.bonus += DIAPER_POINTS_MAXED;
      this.popText(x, y - 20, `+${DIAPER_POINTS_MAXED}`, '#ffd166', 36);
      sfx.pickup();
      return;
    }

    this.bonus += DIAPER_POINTS;
    this.popText(x, y - 20, `+${DIAPER_POINTS}`);
    this.suitUp();
  }

  // Adds the next diaper piece to the hero
  suitUp() {
    this.stage += 1;
    const full = this.stage >= MAX_STAGE;
    this.flashHero(full ? 40 : 22);
    const pip = this.pips[this.stage - 1];
    pip.setAlpha(1);
    this.tweens.add({ targets: pip, scale: S(0.9), duration: 150, yoyo: true });
    this.banner(STAGE_NAMES[this.stage], full ? '#ffd166' : '#ffffff', full ? 52 : 44, full ? 1400 : 800);

    if (full) {
      this.trail.start();
      this.cameras.main.flash(250, 255, 240, 170);
      sfx.fullSuit();
    } else {
      sfx.suitUp();
    }
  }

  // White flash + pop on the hero when his outfit changes
  flashHero(sparkCount) {
    const p = this.player;
    p.setTexture(heroKey(this.stage, this.onGround() && this.rocket <= 0 ? 0 : 2));
    p.setTintFill(0xffffff);
    this.time.delayedCall(90, () => { if (!this.isOver) p.clearTint(); });
    this.tweens.add({ targets: p, scale: S(1.35), duration: 130, yoyo: true, ease: 'Quad.out', onComplete: () => p.setScale(S(1)) });
    this.sparks.explode(sparkCount, p.x, p.y);
  }

  // ---------------------------------------------------------------- power-ups
  collectPowerup(item) {
    if (this.isOver) return;
    const key = item.texture.key;
    this.sparks.explode(20, item.x, item.y);
    item.destroy();
    if (key === 'goldDiaper') this.goldenDiaper();
    else this.startRocket();
  }

  // Golden Diaper: the whole suit at once
  goldenDiaper() {
    const wasFull = this.stage >= MAX_STAGE;
    this.stage = MAX_STAGE;
    this.pips.forEach((pip) => pip.setAlpha(1));
    this.flashHero(70);
    this.trail.start();
    this.cameras.main.flash(400, 255, 220, 100);
    this.cameras.main.shake(200, 0.006);
    const pts = wasFull ? 100 : 50;
    this.bonus += pts;
    this.banner('GOLDEN DIAPER!', '#ffd166', 56, 1100, 280);
    this.time.delayedCall(700, () => { if (!this.isOver) this.banner(wasFull ? `+${pts}` : 'SUPER DIAPERMAN!', '#ffffff', 40, 900, 350); });
    sfx.fullSuit();
  }

  // Sippy Cup Rocket: fly, smash through everything, grab a trail of bottles
  startRocket() {
    if (this.vac) this.endVacuum(true); // rocket leaves the vacuum behind
    this.rocket = ROCKET_TIME;
    this.rocketT = 0;
    this.rocketBottleTimer = 0;
    this.rocketHumTimer = 0;
    this.player.body.setAllowGravity(false);
    this.tweens.killTweensOf(this.player);
    this.player.setAngle(12).setScale(S(1));
    this.jetpack.setVisible(true).setAlpha(1);
    this.flames.start();
    this.cameras.main.flash(150, 255, 255, 255);
    this.banner('ROCKET!', '#4cc9f0', 64, 700, 280);
    sfx.rocket();
  }

  // Height of the rocket's wavy flight path at rocket-time t
  rocketY(t) {
    const rise = Math.min(1, t / 0.5); // ease up from wherever he was
    return GROUND_Y - 170 + Math.sin(t * 4.2) * 95 * rise;
  }

  updateRocket(dt) {
    const p = this.player;
    this.rocket -= dt;
    this.rocketT += dt;

    // Steer smoothly along the wave
    const target = this.rocketY(this.rocketT);
    p.setVelocityY((target - p.y) * 8);
    p.setTexture(heroKey(this.stage, 2));
    this.jetpack.setPosition(p.x - 26, p.y + 4).setAngle(12);
    this.flames.setPosition(p.x - 34, p.y + 26);

    // Blink the cup when it's about to run out
    this.jetpack.setAlpha(this.rocket < 0.9 && Math.floor(this.rocket * 10) % 2 === 0 ? 0.3 : 1);

    // Lay a trail of bottles along where he'll be flying
    this.rocketBottleTimer -= dt;
    if (this.rocketBottleTimer <= 0) {
      this.rocketBottleTimer = 0.16;
      const arrive = this.rocketT + (SPAWN_X - HERO_X) / this.worldSpeed();
      if (arrive < ROCKET_TIME - 0.2) this.addBottles(SPAWN_X, this.rocketY(arrive), 1);
    }

    // Magnet: nearby goodies fly to him
    for (const group of [this.bottles, this.diapers, this.powerups]) {
      for (const it of group.getChildren()) {
        const dx = p.x - it.x;
        const dy = p.y - it.y;
        if (dx * dx + dy * dy < 200 * 200) {
          this.tweens.killTweensOf(it);
          it.x += dx * 0.2;
          it.y += dy * 0.2;
        }
      }
    }

    this.rocketHumTimer -= dt;
    if (this.rocketHumTimer <= 0) { this.rocketHumTimer = 0.22; sfx.rocketHum(); }

    if (this.rocket <= 0) this.endRocket();
  }

  endRocket() {
    const p = this.player;
    this.rocket = 0;
    p.body.setAllowGravity(true);
    p.setAngle(0);
    this.jumps = 1; // one more mid-air jump to land safely
    this.flames.stop();
    this.jetpack.setVisible(false);
    const cup = this.add.image(this.jetpack.x, this.jetpack.y, 'jetpack').setDepth(9).setScale(S(1));
    this.tweens.add({ targets: cup, x: cup.x - 120, y: GROUND_Y + 40, angle: -400, duration: 800, ease: 'Quad.in', onComplete: () => cup.destroy() });
    this.makeSafe(1200);
    sfx.rocketEnd();
  }

  // Knock an obstacle flying (rocket only)
  smash(obs) {
    if (!obs.active || !obs.body.enable) return;
    this.obstacles.remove(obs);
    obs.body.enable = false;
    this.tweens.killTweensOf(obs);
    this.tweens.add({
      targets: obs, x: obs.x + 260, y: obs.y - 320, angle: 720, alpha: 0, duration: 650,
      ease: 'Quad.out', onComplete: () => obs.destroy(),
    });
    this.sparks.explode(10, obs.x, obs.y);
    this.bonus += 2;
    this.popText(obs.x, obs.y - 40, 'SMASH!', '#ffffff', 26);
    this.cameras.main.shake(80, 0.005);
    sfx.smash();
  }

  // ---------------------------------------------------------------- surprise events
  tryStartEvent() {
    if (this.rocket > 0 || this.blowout || this.vac) return;
    // Pick the event once, then wait for a good moment to start it
    if (!this.pendingEvent) {
      const vacuumOk = this.elapsed > VACUUM_UNLOCK;
      // less likely to repeat the same event twice in a row
      const vacChance = this.lastEvent === 'vacuum' ? 0.25 : this.lastEvent === 'blowout' ? 0.8 : VACUUM_CHANCE;
      this.pendingEvent = vacuumOk && Math.random() < vacChance ? 'vacuum' : 'blowout';
    }
    if (this.pendingEvent === 'vacuum') {
      this.startVacuum();
    } else if (this.onGround()) {
      this.startBlowout();
    } else {
      return; // wait until he lands
    }
    this.lastEvent = this.pendingEvent;
    this.pendingEvent = null;
    this.eventDue = Phaser.Math.FloatBetween(EVENT_EVERY[0], EVENT_EVERY[1]);
  }

  // Diaper Blowout: stinky cloud launches him into the sky, bottles up there
  startBlowout() {
    const p = this.player;
    this.blowout = { t: 0 };
    this.tweens.killTweensOf(p);
    p.setAngle(0).setScale(S(1));
    p.setVelocityY(BLOWOUT_VELOCITY);
    this.jumps = 2;
    this.stink.explode(18, p.x, p.y + 30);
    const cloud = this.add.image(p.x, GROUND_Y - 20, 'stink').setScale(S(2)).setDepth(9).setAlpha(0.9);
    this.tweens.add({ targets: cloud, x: cloud.x - 300, scale: S(5), alpha: 0, duration: 1600, onComplete: () => cloud.destroy() });
    this.cameras.main.shake(180, 0.01);
    this.banner('DIAPER BLOWOUT!', '#95d5b2', 50, 1000, 250);
    sfx.blowout();

    // Bottles placed exactly along his flight path
    const g = this.physics.world.gravity.y;
    const y0 = p.y;
    const tPeak = -BLOWOUT_VELOCITY / g;
    const peakY = y0 + BLOWOUT_VELOCITY * tPeak + 0.5 * g * tPeak * tPeak;
    const gFloat = g + BLOWOUT_FLOAT_GRAVITY;
    const yAt = (t) => (t < tPeak
      ? y0 + BLOWOUT_VELOCITY * t + 0.5 * g * t * t
      : peakY + 0.5 * gFloat * (t - tPeak) ** 2);
    const v = this.worldSpeed();
    for (let i = 0; i < 8; i++) {
      const t = 0.2 + i * 0.17;
      const y = yAt(t);
      if (y > GROUND_Y - 60) break;
      this.addBottles(HERO_X + v * t, y, 1);
    }
  }

  updateBlowout(dt) {
    const p = this.player;
    this.blowout.t += dt;
    p.setTexture(heroKey(this.stage, 2));
    // Float down slowly after the peak
    if (p.body.velocity.y > 0) p.body.setGravityY(BLOWOUT_FLOAT_GRAVITY);
    if (this.blowout.t > 0.3 && Math.random() < 0.3) this.stink.explode(1, p.x - 10, p.y + 30);
    if (this.blowout.t > 0.3 && this.onGround()) {
      p.body.setGravityY(0);
      this.blowout = null;
      this.makeSafe(800);
    }
  }

  // The Vacuum Is Coming! Survive the chase without getting hit.
  startVacuum() {
    const v = this.add.image(-140, GROUND_Y - 60, 'vacuum').setDepth(12).setScale(S(1));
    this.vac = { sprite: v, t: 0, rumble: 0, dust: 0, lunging: false };
    this.tweens.add({ targets: v, angle: { from: -3, to: 3 }, duration: 90, yoyo: true, repeat: -1 });
    this.banner('THE VACUUM IS COMING!', '#ef476f', 40, 1200, 280);
    this.cameras.main.shake(250, 0.006);
  }

  updateVacuum(dt) {
    const vac = this.vac;
    const v = vac.sprite;
    vac.t += dt;
    if (!vac.lunging) v.x += (48 - v.x) * Math.min(1, dt * 2.5);

    // Rumble + dust being sucked in
    vac.rumble -= dt;
    if (vac.rumble <= 0) { vac.rumble = 0.45; sfx.vacuum(); }
    vac.dust -= dt;
    if (vac.dust <= 0) {
      vac.dust = 0.07;
      // Reuse dust specks instead of creating/destroying ~14 images a second
      const d = this.dustPool.pop() || this.add.image(0, 0, 'dust').setDepth(11).setTint(0xdddddd);
      d.setPosition(v.x + 80 + Phaser.Math.Between(40, 220), GROUND_Y - Phaser.Math.Between(5, 160))
        .setScale(S(1)).setAlpha(0.8).setVisible(true);
      this.tweens.add({
        targets: d, x: v.x + 68, y: GROUND_Y - 24, scale: S(0.3), duration: 260,
        onComplete: () => { d.setVisible(false); this.dustPool.push(d); },
      });
    }

    if (vac.t >= VACUUM_TIME) this.endVacuum(true);
  }

  endVacuum(escaped) {
    const vac = this.vac;
    if (!vac) return;
    this.vac = null;
    const v = vac.sprite;
    this.tweens.add({ targets: v, x: -260, duration: 900, ease: 'Quad.in', onComplete: () => v.destroy() });
    if (escaped) {
      this.bonus += VACUUM_ESCAPE_POINTS;
      this.banner(`ESCAPED! +${VACUUM_ESCAPE_POINTS}`, '#06d6a0', 46, 900, 300);
      sfx.escaped();
    }
  }

  drawMeter() {
    this.meter.clear();
    let frac = 0;
    let color = 0x4cc9f0;
    let label = '';
    if (this.rocket > 0) {
      frac = this.rocket / ROCKET_TIME;
      label = 'ROCKET';
    } else if (this.vac) {
      frac = 1 - this.vac.t / VACUUM_TIME;
      color = 0xef476f;
      label = 'ESCAPE THE VACUUM!';
    }
    this.meterLabel.setText(label);
    if (!label) return;
    const w = 220;
    this.meter.fillStyle(0x1d3557, 0.5);
    this.meter.fillRoundedRect(W / 2 - w / 2 - 4, 166, w + 8, 16, 8);
    this.meter.fillStyle(color, 1);
    this.meter.fillRoundedRect(W / 2 - w / 2, 169, Math.max(8, w * frac), 10, 5);
  }

  // ---------------------------------------------------------------- getting hit
  // Each diaper piece works like an extra life: a hit knocks the newest piece off.
  // Only a naked baby loses the run.
  hit(obs) {
    if (this.isOver) return;
    if (this.rocket > 0) { this.smash(obs); return; }
    if (this.invulnerable || this.blowout) return;

    const vac = this.vac;
    if (this.stage === 0) {
      if (vac) {
        vac.lunging = true;
        this.tweens.add({ targets: vac.sprite, x: HERO_X - 40, duration: 200 });
      }
      this.gameOver();
      return;
    }

    const lost = this.stage;
    this.stage -= 1;
    const p = this.player;
    if (lost === MAX_STAGE) this.trail.stop();

    p.setTexture(heroKey(this.stage, 2));
    this.pips[lost - 1].setAlpha(0.3);

    // The lost diaper goes flying... or gets sucked into the vacuum
    const fly = this.add.image(p.x, p.y - 20, 'diaperItem').setDepth(13).setScale(S(1));
    if (vac) {
      vac.lunging = true;
      this.tweens.add({ targets: vac.sprite, x: 95, duration: 180, yoyo: true });
      this.tweens.add({
        targets: fly, x: vac.sprite.x + 130, y: GROUND_Y - 24, angle: 540, scale: S(0.3),
        duration: 380, ease: 'Quad.in', onComplete: () => fly.destroy(),
      });
      this.popText(Math.max(p.x + 60, 220), p.y - 80, 'SUCKED UP!', '#ef476f', 30);
      this.time.delayedCall(400, () => this.endVacuum(false));
    } else {
      this.tweens.add({
        targets: fly, x: p.x - 170, y: p.y - 230, angle: -540, alpha: 0, scale: S(0.6),
        duration: 750, ease: 'Quad.out', onComplete: () => fly.destroy(),
      });
      const label = lost === MAX_STAGE ? 'POWER LOST!' : `LOST ${STAGE_NAMES[lost].replace('!', '')}!`;
      this.popText(Math.max(p.x + 60, 220), p.y - 80, label, '#ef476f', 28);
    }
    this.cameras.main.shake(150, 0.008);
    sfx.ouch();

    // Little bounce, then blink while safe
    p.setVelocityY(-560);
    this.jumps = 1;
    this.makeSafe(1600);
  }

  // Blink and ignore hits for a moment
  makeSafe(ms) {
    const p = this.player;
    this.invulnerable = true;
    this.safeBlink?.stop();
    this.safeBlink = this.tweens.add({ targets: p, alpha: 0.25, duration: 90, yoyo: true, repeat: -1 });
    this.safeTimer?.remove();
    this.safeTimer = this.time.delayedCall(ms, () => {
      this.safeBlink?.stop();
      p.setAlpha(1);
      this.invulnerable = false;
    });
  }

  // ---------------------------------------------------------------- game over
  gameOver() {
    if (this.isOver) return;
    this.isOver = true;
    this.physics.pause();
    this.trail.stop();
    this.flames.stop();
    this.mouth.setVisible(false);
    this.meter.clear();
    this.meterLabel.setText('');
    this.tweens.killTweensOf(this.player);
    this.player.anims.stop();
    this.player.setTexture(heroKey(this.stage, 2)).setTint(0xff9a9a).setAngle(0).setScale(S(1)).setAlpha(1);
    this.cameras.main.shake(260, 0.012);
    sfx.hit();

    const isBest = this.score > this.best;
    if (isBest) saveBest(this.score);

    this.time.delayedCall(550, () => this.showGameOver(isBest));
  }

  showGameOver(isBest) {
    const online = leaderboardEnabled();
    this.add.rectangle(W / 2, H / 2, W, H, 0x1d3557, 0.35).setDepth(200);
    const panel = this.add.container(W / 2, H / 2 - 10).setDepth(201);
    this.panel = panel;
    const top = online ? -370 : -250;      // taller panel when the top 5 is shown
    const bottom = online ? 370 : 250;
    const box = this.add.graphics();
    box.fillStyle(0xffffff, 1);
    box.fillRoundedRect(-225, top, 450, bottom - top, 32);
    box.lineStyle(6, 0x1d3557, 1);
    box.strokeRoundedRect(-225, top, 450, bottom - top, 32);
    panel.add(box);

    // Your run
    let y = top + 50;
    panel.add(this.add.text(0, y, 'OOPS!', textStyle(52, '#ef476f')).setOrigin(0.5));
    y += 105;
    panel.add(this.add.image(-135, y, heroKey(this.stage, 2)).setScale(S(1.3)));
    panel.add(this.add.text(45, y - 42, `SCORE  ${this.score}`, textStyle(34)).setOrigin(0.5));
    panel.add(this.add.text(45, y, isBest ? 'NEW BEST!' : `BEST  ${this.best}`, textStyle(26, '#ffd166')).setOrigin(0.5));
    panel.add(this.add.text(45, y + 38, `SUIT  ${this.stage}/${MAX_STAGE}`, textStyle(26, '#8ecae6')).setOrigin(0.5));
    y += 92;
    // Leaderboard rank (or the outfit name when there's no online leaderboard)
    const info = this.add.text(0, y, STAGE_NAMES[this.stage].replace('!', ''), textStyle(26, '#ffffff')).setOrigin(0.5);
    panel.add(info);

    // Top 5 (filled in after your score is saved)
    if (online) {
      y += 45;
      panel.add(this.add.rectangle(0, y, 380, 3, 0xe0ecf5));
      panel.add(this.add.text(0, y + 2, ' TOP 5 ', { ...this.plain(20, '#457b9d'), backgroundColor: '#ffffff' }).setOrigin(0.5));
      this.topY = y + 38;
      this.topList = this.add.container(0, 0);
      panel.add(this.topList);
      this.topStatus = this.add.text(0, this.topY + 80, 'Loading...', this.plain(24, '#8aa9c1')).setOrigin(0.5);
      panel.add(this.topStatus);
      // Show the last known top 5 right away; it refreshes after your score is saved
      const cached = cachedTop(5);
      if (cached) this.renderTop5(cached, null, Math.max(this.score, this.best));
    }

    // Share button (taps on it don't restart the game)
    const shareY = bottom - 135;
    const shareBg = this.add.rectangle(0, shareY, 280, 62, 0x3a86ff).setStrokeStyle(5, 0x1d3557);
    const shareTxt = this.add.text(0, shareY, 'SHARE SCORE', textStyle(28)).setOrigin(0.5);
    shareBg.setInteractive({ useHandCursor: true });
    // pointerup (not pointerdown): phones only allow sharing from a finished tap
    shareBg.on('pointerup', () => this.shareScore());
    shareBg.on('pointerdown', () => this.tweens.add({ targets: [shareBg, shareTxt], scale: 0.94, duration: 70, yoyo: true }));
    panel.add([shareBg, shareTxt]);

    const again = this.add.text(0, bottom - 55, 'TAP TO PLAY AGAIN', textStyle(30, '#06d6a0')).setOrigin(0.5);
    panel.add(again);
    panel.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.out' });
    this.tweens.add({ targets: again, scale: 1.08, duration: 550, yoyo: true, repeat: -1, delay: 300 });

    // Small delay so a panicked extra tap doesn't instantly restart
    this.time.delayedCall(450, () => {
      this.input.on('pointerdown', (_p, over) => {
        if (over.length || this.restarting || this.namePrompt) return; // tapped Share or mute
        this.restarting = true;
        this.scene.restart();
      });
      this.input.keyboard?.once('keydown-SPACE', () => { if (!this.namePrompt) this.scene.restart(); });
    });

    if (online) this.sendScore(info, isBest);
  }

  plain(size, color = '#1d3557') {
    return { fontFamily: '"Trebuchet MS", Arial, sans-serif', fontSize: `${size}px`, fontStyle: 'bold', color, resolution: RES };
  }

  // First run: pick a name. Then save the score, show the rank and the fresh top 5.
  async sendScore(info, isBest) {
    if (!getName()) {
      this.namePrompt = true;
      await this.waitMs(700); // let the score panel land first
      await askName(this);
      this.namePrompt = false;
    }
    if (!info.active) return;
    info.setText('Saving score...');
    const myBest = Math.max(this.score, this.best);
    const rank = await submitScore(myBest);
    if (!info.active) return; // already restarted
    if (rank) {
      info.setText(rank === 1 ? '#1 ON THE LEADERBOARD!' : `YOU'RE #${rank}`);
      info.setColor(rank <= 3 ? '#ffd166' : '#ffffff');
      if (rank === 1 && isBest) this.sparks.explode(30, W / 2, H / 2 - 100);
    } else {
      info.setText('Leaderboard offline');
    }

    // Fetched after saving, so your new score is already in the list
    const top5 = await fetchTop(5);
    if (!info.active) return;
    if (top5 || !cachedTop(5)) this.renderTop5(top5, rank, myBest);
  }

  renderTop5(top5, myRank, myBest) {
    this.topList.removeAll(true);
    if (!top5) { this.topStatus.setText("Couldn't load scores"); return; }
    if (top5.length === 0) { this.topStatus.setText('No scores yet'); return; }
    this.topStatus.setText('');

    const ROW = 34;
    const row = (y, rankLabel, name, best, me) => {
      if (me) this.topList.add(this.add.rectangle(0, y, 390, ROW - 4, 0xffd166, 0.6));
      this.topList.add(this.add.text(-180, y, rankLabel, this.plain(rankLabel.length > 3 ? 22 : 22, '#457b9d')).setOrigin(0, 0.5));
      this.topList.add(this.add.text(-130, y, name, this.plain(24)).setOrigin(0, 0.5));
      this.topList.add(this.add.text(180, y, String(best), this.plain(24, '#e85d04')).setOrigin(1, 0.5));
    };
    top5.forEach((r, i) => row(this.topY + i * ROW, ['🥇', '🥈', '🥉'][i] || `${i + 1}.`, r.name, r.best, r.me));

    // Not in the top 5? Show your own spot underneath.
    if (myRank && !top5.some((r) => r.me)) {
      const y = this.topY + 5 * ROW;
      this.topList.add(this.add.text(0, y - 10, '···', this.plain(22, '#a8c5da')).setOrigin(0.5));
      row(y + 14, `${myRank}.`, getName(), myBest, true);
    }

    // Little pop-in
    this.topList.setAlpha(0);
    this.tweens.add({ targets: this.topList, alpha: 1, duration: 250 });
  }

  waitMs(ms) { return new Promise((r) => this.time.delayedCall(ms, r)); }

  shareScore() {
    const url = location.origin + location.pathname;
    const text = `I scored ${this.score} in DiaperMan! Can you beat me?`;
    if (navigator.share) {
      navigator.share({ title: 'DiaperMan', text, url }).catch(() => { /* cancelled */ });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(`${text} ${url}`)
        .then(() => this.toast('Copied! Paste it in Messenger'))
        .catch(() => this.toast(url));
    } else {
      this.toast(url);
    }
  }

  toast(msg) {
    const t = this.add.text(W / 2, H - 120, msg, textStyle(24)).setOrigin(0.5).setDepth(300);
    this.tweens.add({ targets: t, alpha: 0, delay: 1800, duration: 400, onComplete: () => t.destroy() });
  }

  // ---------------------------------------------------------------- loop
  update(_t, delta) {
    if (this.isOver) return;
    const dt = Math.min(delta, 50) / 1000; // clamp big hiccups (e.g. tab switch)
    this.elapsed += dt;

    // Speed: steady climb, plus temporary boosts
    this.speed = Math.min(MAX_SPEED, this.speed + SPEED_GAIN * dt);
    const targetMul = this.rocket > 0 ? ROCKET_SPEED_MUL : this.vac ? VACUUM_SPEED_MUL : 1;
    this.speedMul += (targetMul - this.speedMul) * Math.min(1, dt * 4);
    const ws = this.worldSpeed();
    const dx = ws * dt;
    this.distance += dx;
    this.bg.scroll(dx);

    // Move world objects; remove when off screen
    for (const group of [this.obstacles, this.bottles, this.diapers, this.powerups]) {
      for (const obj of group.getChildren().slice()) {
        obj.body.setVelocityX(-ws);
        if (obj.x < -100) obj.destroy();
      }
    }

    // Timers run in "distance time" so gaps stay the same size when boosted
    const tdt = dt * this.speedMul;
    this.diaperDue -= tdt;
    if (this.rocket <= 0) this.powerupDue -= dt;
    if (!this.blowout) {
      this.spawnTimer -= tdt;
      if (this.spawnTimer <= 0) this.spawn();
    }

    // Power-ups and events
    if (this.rocket > 0) this.updateRocket(dt);
    if (this.blowout) this.updateBlowout(dt);
    if (this.vac) this.updateVacuum(dt);
    this.eventDue -= dt;
    if (this.eventDue <= 0) this.tryStartEvent();
    this.drawMeter();

    // Hero animation for the current outfit
    if (this.rocket <= 0 && !this.blowout) {
      if (this.onGround()) {
        this.jumps = 0;
        this.player.anims.play(`run${this.stage}`, true);
        this.player.anims.timeScale = this.speed / START_SPEED;
      } else {
        this.player.anims.stop();
        this.player.setTexture(heroKey(this.stage, 2));
      }
    } else {
      this.player.anims.stop();
    }

    // Puffed blubbing mouth follows the face
    this.mouthTimer -= dt;
    const blubbing = this.mouthTimer > 0;
    this.mouth.setVisible(blubbing);
    if (blubbing) {
      const m = this.mouthPos();
      this.mouth.setPosition(m.x, m.y).setRotation(this.player.rotation).setAlpha(this.player.alpha);
    }

    this.score = Math.floor(this.distance / 50) + this.bonus;
    this.scoreText.setText(String(this.score));
  }
}
