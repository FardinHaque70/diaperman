// All game art is drawn in code and baked into textures at startup,
// so the game needs no image files and loads almost instantly.
import { COLORS as C, W, H, GROUND_Y, MAX_STAGE } from './config.js';

export const HERO_W = 80;
export const HERO_H = 92;
// pose: 0 / 1 = running frames, 2 = jumping
export const heroKey = (stage, pose) => `hero_${stage}_${pose}`;

export function makeTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const bake = (key, w, h, draw) => { g.clear(); draw(g); g.generateTexture(key, w, h); };

  // Hero: every outfit stage (0 = naked ... 8 = full DiaperMan) x 3 poses
  for (let stage = 0; stage <= MAX_STAGE; stage++) {
    for (let pose = 0; pose < 3; pose++) {
      bake(heroKey(stage, pose), HERO_W, HERO_H, (g) => drawHero(g, pose, stage));
    }
  }
  bake('diaperItem', 46, 36, (g) => drawDiaperItem(g, false));
  bake('goldDiaper', 46, 36, (g) => drawDiaperItem(g, true));

  // Power-ups and events
  bake('cupItem', 52, 60, (g) => drawSippyCup(g, true));
  bake('jetpack', 36, 48, (g) => drawSippyCup(g, false));
  bake('flame', 18, 18, (g) => {
    g.fillStyle(0xff6b35, 1); g.fillCircle(9, 9, 9);
    g.fillStyle(0xffd166, 1); g.fillCircle(9, 9, 5);
  });
  bake('stink', 30, 30, (g) => {
    g.fillStyle(0x95d5b2, 0.9); g.fillCircle(11, 17, 10); g.fillCircle(19, 12, 10);
    g.fillStyle(0x74c69d, 0.9); g.fillCircle(18, 19, 8);
  });
  bake('vacuum', 140, 120, drawVacuum);

  // Spit bubbles + puffed "O" mouth for blubbing
  bake('spit', 28, 28, (g) => drawBubble(g, 14, 12));
  bake('mouthO', 14, 14, (g) => {
    g.fillStyle(0xc9184a, 1);
    g.fillEllipse(7, 7, 10, 11);
    g.lineStyle(2, C.outline, 1);
    g.strokeEllipse(7, 7, 10, 11);
  });

  bake('blockRed', 56, 56, (g) => drawBlock(g, 0xef476f, 0xff8fab));
  bake('blockBlue', 56, 56, (g) => drawBlock(g, 0x118ab2, 0x73d2f6));
  bake('blockGreen', 56, 56, (g) => drawBlock(g, 0x06d6a0, 0x9bf6d8));
  bake('duck', 64, 58, drawDuck);
  bake('bee', 60, 48, drawBee);
  bake('bottle', 30, 46, drawBottle);

  bake('ground', 64, H - GROUND_Y + 12, drawGround);
  bake('hills', W, 200, drawHills);
  bake('clouds', W, 300, drawClouds);

  bake('dust', 12, 12, (g) => { g.fillStyle(0xffffff, 1); g.fillCircle(6, 6, 6); });
  bake('spark', 14, 14, (g) => {
    g.fillStyle(C.gold, 1);
    g.fillPoints(star(7, 7, 7, 3, 4), true);
  });

  g.destroy();
}

function star(cx, cy, outer, inner, points) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

// Outfit stages, each one adds a diaper piece:
// 1 diaper, 2 helmet, 3 cape, 4 mask, 5 gloves, 6 boots, 7 chest armor, 8 gold trim (full power)
function drawHero(g, pose, stage) {
  const O = C.outline;
  const D = C.diaper;
  const has = (n) => stage >= n;
  const T = has(8) ? C.gold : C.diaperTab; // tape tabs turn gold at full power
  const wave = pose === 1 ? 6 : 0;

  g.save();
  g.translateCanvas(4, 12); // headroom for the helmet
  g.lineStyle(3, O, 1);

  // Cape (behind everything)
  if (has(3)) {
    const cape = pose === 2
      ? [{ x: 34, y: 34 }, { x: 2, y: 28 }, { x: 8, y: 46 }, { x: 30, y: 56 }]
      : [{ x: 34, y: 34 }, { x: 2, y: 42 + wave }, { x: 10, y: 56 + wave }, { x: 30, y: 58 }];
    g.fillStyle(D, 1);
    g.fillPoints(cape, true);
    g.strokePoints(cape, true);
    // quilted diaper lines
    g.lineStyle(2.5, T, 1);
    g.lineBetween(30, 40, cape[1].x + 6, cape[1].y + 4);
    g.lineBetween(30, 48, cape[2].x + 6, cape[2].y - 3);
    g.lineStyle(3, O, 1);
  }

  // Legs + feet (or diaper boots)
  const legs = pose === 0 ? [[28, 60, 14], [42, 58, 11]]
    : pose === 1 ? [[30, 58, 11], [41, 60, 14]]
    : [[27, 58, 9], [42, 57, 9]];
  for (const [x, y, h] of legs) {
    g.fillStyle(C.skin, 1);
    g.fillRoundedRect(x, y, 10, h, 4);
    g.strokeRoundedRect(x, y, 10, h, 4);
    if (has(6)) {
      g.fillStyle(D, 1);
      g.fillRoundedRect(x - 2, y + h - 7, 18, 11, 5);
      g.strokeRoundedRect(x - 2, y + h - 7, 18, 11, 5);
      g.fillStyle(T, 1);
      g.fillRect(x + 1, y + h - 5, 4, 4);
    } else {
      g.fillStyle(C.skin, 1);
      g.fillEllipse(x + 7, y + h, 14, 7);
      g.strokeEllipse(x + 7, y + h, 14, 7);
    }
  }

  // Torso: chubby baby belly, or diaper chest armor
  g.fillStyle(has(7) ? D : C.skin, 1);
  g.fillEllipse(39, 46, 28, 24);
  g.strokeEllipse(39, 46, 28, 24);
  if (has(7)) {
    g.fillStyle(T, 1);
    g.fillRect(27, 40, 4, 4);
    g.fillStyle(C.gold, 1);
    g.fillPoints(star(40, 44, 7, 3, 5), true);
  } else {
    g.fillStyle(0xe8a87c, 1);
    g.fillCircle(41, 50, 1.6); // belly button
  }

  // Bottom: diaper, or a bare baby bum
  if (has(1)) {
    g.fillStyle(D, 1);
    g.fillRoundedRect(23, 50, 32, 16, 7);
    g.strokeRoundedRect(23, 50, 32, 16, 7);
    g.fillStyle(T, 1);
    g.fillRect(25, 53, 5, 5);
    g.fillRect(48, 53, 5, 5);
    if (has(8)) {
      g.fillStyle(C.gold, 1);
      g.fillRect(24, 51, 30, 4); // golden waistband
    }
  } else {
    g.fillStyle(C.skin, 1);
    g.fillRoundedRect(25, 52, 28, 12, 6);
    g.strokeRoundedRect(25, 52, 28, 12, 6);
  }

  // Arm reaching forward (+ diaper glove)
  const armY = pose === 2 ? 36 : 44;
  g.fillStyle(C.skin, 1);
  g.fillEllipse(55, armY, 18, 9);
  g.strokeEllipse(55, armY, 18, 9);
  if (has(5)) {
    g.fillStyle(D, 1);
    g.fillCircle(63, armY, 7);
    g.strokeCircle(63, armY, 7);
    g.fillStyle(T, 1);
    g.fillRect(56, armY - 2, 3, 4);
  }

  // Head
  g.fillStyle(C.skin, 1);
  g.fillCircle(40, 21, 17);
  g.strokeCircle(40, 21, 17);
  g.fillStyle(0xff8fa3, 0.6);
  g.fillCircle(50, 27, 3.5);

  if (!has(2)) {
    // Baby hair curl
    g.lineStyle(3, 0x8d5a3b, 1);
    g.beginPath();
    g.arc(40, 6, 4, Math.PI * 0.9, Math.PI * 2.2);
    g.strokePath();
    g.lineStyle(3, O, 1);
  }

  // Diaper mask
  if (has(4)) {
    g.fillStyle(D, 1);
    g.fillTriangle(25, 16, 12, 11 + wave / 2, 15, 23 + wave / 2);
    g.strokeTriangle(25, 16, 12, 11 + wave / 2, 15, 23 + wave / 2);
    g.fillEllipse(42, 18, 32, 11);
    g.lineStyle(2.5, O, 1);
    g.strokeEllipse(42, 18, 32, 11);
  }

  // Eyes (big baby eyes)
  g.fillStyle(0xffffff, 1);
  g.fillCircle(38, 18, 3.6);
  g.fillCircle(49, 18, 3.6);
  g.lineStyle(1.5, O, 1);
  g.strokeCircle(38, 18, 3.6);
  g.strokeCircle(49, 18, 3.6);
  g.fillStyle(O, 1);
  g.fillCircle(39.5, 18, 2);
  g.fillCircle(50.5, 18, 2);

  // Smile
  g.lineStyle(2.5, O, 1);
  g.beginPath();
  g.arc(45, 25, 5, 0.25, Math.PI - 0.25);
  g.strokePath();

  // Diaper helmet
  if (has(2)) {
    g.lineStyle(3, O, 1);
    g.fillStyle(D, 1);
    g.beginPath();
    g.arc(40, 11, 17, Math.PI, 0);
    g.closePath();
    g.fillPath();
    g.strokePath();
    g.fillStyle(T, 1);
    g.fillRoundedRect(21, 8, 38, 5, 2);
    g.strokeRoundedRect(21, 8, 38, 5, 2);
    // little folded tab on top
    g.fillStyle(D, 1);
    g.fillTriangle(36, -5, 44, -5, 40, -11);
    g.strokeTriangle(36, -5, 44, -5, 40, -11);
  }

  g.restore();
}

function drawBubble(g, c, r) {
  g.fillStyle(0xbde0fe, 0.5);
  g.fillCircle(c, c, r);
  g.lineStyle(Math.max(2, r / 8), 0x5fa8d3, 0.9);
  g.strokeCircle(c, c, r);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(c - r * 0.4, c - r * 0.4, r * 0.22);
  g.fillCircle(c - r * 0.1, c - r * 0.6, r * 0.1);
}

function drawDiaperItem(g, gold) {
  const O = C.outline;
  // soft glow
  g.fillStyle(gold ? 0xffd166 : 0xfff3a0, gold ? 0.75 : 0.55);
  g.fillEllipse(23, 18, 46, 36);
  g.lineStyle(3, O, 1);
  // diaper shape: wide at the top, narrow in the middle
  const pts = [
    { x: 6, y: 7 }, { x: 40, y: 7 }, { x: 37, y: 18 }, { x: 30, y: 30 },
    { x: 16, y: 30 }, { x: 9, y: 18 },
  ];
  g.fillStyle(gold ? 0xffc300 : C.diaper, 1);
  g.fillPoints(pts, true);
  g.strokePoints(pts, true);
  g.lineStyle(2, gold ? 0xffffff : C.diaperTab, 1);
  g.lineBetween(10, 12, 36, 12); // waistband
  g.fillStyle(gold ? 0xffffff : C.diaperTab, 1);
  g.fillRect(4, 6, 7, 6);
  g.fillRect(35, 6, 7, 6);
  g.fillStyle(gold ? 0xffffff : C.gold, 1);
  g.fillPoints(star(23, 21, 5, 2, 5), true);
}

function drawBlock(g, main, light) {
  g.fillStyle(main, 1);
  g.fillRoundedRect(2, 2, 52, 52, 8);
  g.lineStyle(3, C.outline, 1);
  g.strokeRoundedRect(2, 2, 52, 52, 8);
  g.fillStyle(light, 1);
  g.fillRoundedRect(11, 11, 34, 34, 6);
  g.fillStyle(main, 1);
  g.fillPoints(star(28, 28, 12, 5, 5), true);
  g.fillStyle(0xffffff, 0.35);
  g.fillRoundedRect(6, 6, 18, 5, 2);
}

function drawDuck(g) {
  const O = C.outline;
  g.lineStyle(3, O, 1);
  // Body
  g.fillStyle(0xffd23f, 1);
  g.fillEllipse(30, 40, 50, 30);
  g.strokeEllipse(30, 40, 50, 30);
  // Tail
  g.fillTriangle(4, 30, 10, 42, 16, 32);
  // Head
  g.fillCircle(20, 20, 14);
  g.strokeCircle(20, 20, 14);
  // Beak (faces left, toward the player)
  g.fillStyle(0xff8c42, 1);
  g.fillTriangle(8, 18, 0, 24, 9, 27);
  g.strokeTriangle(8, 18, 0, 24, 9, 27);
  // Angry eye
  g.fillStyle(O, 1);
  g.fillCircle(16, 17, 2.6);
  g.lineStyle(2.5, O, 1);
  g.lineBetween(11, 11, 20, 14);
  // Wing
  g.fillStyle(0xf4b400, 1);
  g.fillEllipse(36, 38, 22, 12);
}

function drawBee(g) {
  const O = C.outline;
  // Wings
  g.fillStyle(0xffffff, 0.85);
  g.lineStyle(2, O, 1);
  g.fillEllipse(26, 12, 18, 20);
  g.strokeEllipse(26, 12, 18, 20);
  g.fillEllipse(38, 12, 16, 18);
  g.strokeEllipse(38, 12, 16, 18);
  // Body
  g.lineStyle(3, O, 1);
  g.fillStyle(0xffc300, 1);
  g.fillEllipse(30, 30, 48, 30);
  g.fillStyle(O, 1);
  g.fillRect(26, 16, 7, 28);
  g.fillRect(39, 18, 6, 24);
  g.strokeEllipse(30, 30, 48, 30);
  // Stinger (behind)
  g.fillTriangle(53, 28, 60, 31, 53, 34);
  // Eye (faces left)
  g.fillStyle(0xffffff, 1);
  g.fillCircle(14, 27, 5);
  g.fillStyle(O, 1);
  g.fillCircle(12.5, 27, 2.5);
}

function drawBottle(g) {
  const O = C.outline;
  g.lineStyle(2.5, O, 1);
  // Nipple
  g.fillStyle(0xffb4a2, 1);
  g.fillEllipse(15, 7, 10, 12);
  g.strokeEllipse(15, 7, 10, 12);
  // Ring
  g.fillStyle(0x8ecae6, 1);
  g.fillRoundedRect(6, 11, 18, 7, 3);
  g.strokeRoundedRect(6, 11, 18, 7, 3);
  // Body
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(4, 17, 22, 27, 7);
  g.strokeRoundedRect(4, 17, 22, 27, 7);
  g.fillStyle(0xfff5dc, 1);
  g.fillRoundedRect(7, 27, 16, 14, 5);
  g.lineStyle(2, 0x8ecae6, 1);
  g.lineBetween(9, 23, 14, 23);
  g.lineBetween(9, 29, 14, 29);
}

function drawGround(g) {
  const h = H - GROUND_Y + 12;
  g.fillStyle(0xc68b59, 1);
  g.fillRect(0, 0, 64, h);
  g.fillStyle(0xa86f43, 1);
  g.fillCircle(12, 50, 5);
  g.fillCircle(44, 80, 6);
  g.fillCircle(26, 120, 4);
  g.fillCircle(54, 140, 3);
  // Grass strip with bumps (seamless every 64px)
  g.fillStyle(0x52b788, 1);
  g.fillRect(0, 0, 64, 22);
  g.fillCircle(16, 22, 8);
  g.fillCircle(48, 22, 8);
  g.fillStyle(0x74c69d, 1);
  g.fillRect(0, 0, 64, 9);
}

function drawHills(g) {
  // Far hills
  g.fillStyle(0xa7e3c1, 1);
  for (const [x, r] of [[0, 140], [200, 120], [380, 150], [540, 140]]) g.fillCircle(x, 200 + r * 0.25, r);
  // Near hills
  g.fillStyle(0x84d2a6, 1);
  for (const [x, r] of [[90, 110], [300, 95], [470, 105]]) g.fillCircle(x, 210 + r * 0.35, r);
  // A few round trees
  for (const x of [150, 420]) {
    g.fillStyle(0x8d5a3b, 1);
    g.fillRect(x - 4, 150, 8, 50);
    g.fillStyle(0x52b788, 1);
    g.fillCircle(x, 140, 26);
  }
}

function drawClouds(g) {
  g.fillStyle(0xffffff, 0.95);
  const cloud = (x, y, s) => {
    g.fillCircle(x, y, 22 * s);
    g.fillCircle(x + 26 * s, y - 10 * s, 28 * s);
    g.fillCircle(x + 56 * s, y, 22 * s);
    g.fillRoundedRect(x - 10 * s, y, 86 * s, 20 * s, 10 * s);
  };
  cloud(40, 60, 1);
  cloud(300, 40, 0.8);
  cloud(190, 200, 1.1);
  cloud(420, 160, 0.7);
}

// Sippy cup: as a floating power-up (with glow) or strapped on as a jetpack
function drawSippyCup(g, item) {
  const O = C.outline;
  const ox = item ? 8 : 0;
  const oy = item ? 6 : 0;
  if (item) {
    g.fillStyle(0xfff3a0, 0.6);
    g.fillCircle(26, 30, 26);
  }
  g.lineStyle(3, O, 1);
  // handles
  g.strokeCircle(ox + 6, oy + 26, 5);
  g.strokeCircle(ox + 30, oy + 26, 5);
  // spout
  g.fillStyle(0xf72585, 1);
  g.fillPoints([{ x: ox + 13, y: oy + 10 }, { x: ox + 23, y: oy + 10 }, { x: ox + 21, y: oy + 1 }, { x: ox + 15, y: oy + 1 }], true);
  g.strokePoints([{ x: ox + 13, y: oy + 10 }, { x: ox + 23, y: oy + 10 }, { x: ox + 21, y: oy + 1 }, { x: ox + 15, y: oy + 1 }], true);
  // lid
  g.fillRoundedRect(ox + 4, oy + 9, 28, 8, 4);
  g.strokeRoundedRect(ox + 4, oy + 9, 28, 8, 4);
  // cup
  g.fillStyle(0x4cc9f0, 1);
  g.fillRoundedRect(ox + 7, oy + 16, 22, 26, 7);
  g.strokeRoundedRect(ox + 7, oy + 16, 22, 26, 7);
  g.fillStyle(0xffffff, 0.8);
  g.fillRoundedRect(ox + 10, oy + 20, 5, 14, 2);
  g.fillStyle(C.gold, 1);
  g.fillPoints(star(ox + 20, oy + 29, 6, 2.5, 5), true);
  if (item) {
    // little flame so it reads as "rocket"
    g.fillStyle(0xff6b35, 1);
    g.fillTriangle(ox + 12, oy + 42, ox + 24, oy + 42, ox + 18, oy + 53);
    g.fillStyle(0xffd166, 1);
    g.fillTriangle(ox + 15, oy + 42, ox + 21, oy + 42, ox + 18, oy + 48);
  }
}

// Grumpy upright vacuum cleaner, facing right (toward the hero)
function drawVacuum(g) {
  const O = C.outline;
  g.lineStyle(3, O, 1);
  // handle
  g.lineStyle(8, 0x6c757d, 1);
  g.lineBetween(46, 30, 16, 4);
  g.lineStyle(3, O, 1);
  g.fillStyle(0x343a40, 1);
  g.fillCircle(14, 4, 6);
  // bag
  g.fillStyle(0xffd166, 1);
  g.fillRoundedRect(30, 12, 44, 44, 16);
  g.strokeRoundedRect(30, 12, 44, 44, 16);
  // body
  g.fillStyle(0xef476f, 1);
  g.fillRoundedRect(24, 36, 70, 54, 16);
  g.strokeRoundedRect(24, 36, 70, 54, 16);
  // angry face
  g.fillStyle(0xffffff, 1);
  g.fillCircle(64, 56, 8);
  g.fillCircle(82, 56, 8);
  g.strokeCircle(64, 56, 8);
  g.strokeCircle(82, 56, 8);
  g.fillStyle(O, 1);
  g.fillCircle(67, 57, 3.5);
  g.fillCircle(85, 57, 3.5);
  g.lineStyle(4, O, 1);
  g.lineBetween(55, 44, 70, 50);
  g.lineBetween(91, 44, 76, 50);
  g.lineStyle(3, O, 1);
  g.fillStyle(0xffffff, 1);
  g.fillRect(62, 70, 24, 8);
  g.strokeRect(62, 70, 24, 8);
  g.lineBetween(70, 70, 70, 78);
  g.lineBetween(78, 70, 78, 78);
  // base + nozzle
  g.fillStyle(0x9d4edd, 1);
  g.fillRoundedRect(8, 86, 126, 20, 9);
  g.strokeRoundedRect(8, 86, 126, 20, 9);
  g.fillStyle(O, 1);
  g.fillEllipse(130, 96, 8, 14);
  // wheels
  g.fillStyle(0x343a40, 1);
  g.fillCircle(30, 108, 9);
  g.fillCircle(104, 108, 9);
  g.fillStyle(0xadb5bd, 1);
  g.fillCircle(30, 108, 3);
  g.fillCircle(104, 108, 3);
}
