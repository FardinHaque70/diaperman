// Shared game constants. The game is 540 wide; its height follows the
// screen's shape so it fills the whole screen on any phone (no side bars).
// 960 tall on a 16:9 screen, taller on modern tall phones.
export const W = 540;
const screenRatio = (window.innerHeight || 960) / (window.innerWidth || 540);
export const H = Math.round(Math.min(1300, Math.max(930, W * screenRatio)));
export const GROUND_Y = H - 160; // ground sits the same distance from the bottom

export const FONT = '"Trebuchet MS", "Arial Rounded MT Bold", Arial, sans-serif';

export const COLORS = {
  outline: 0x2b2d42,
  skin: 0xffd6b0,
  cape: 0xe63946,
  mask: 0x1d3557,
  shirt: 0x3a86ff,
  diaper: 0xffffff,
  diaperTab: 0x8ecae6,
  gold: 0xffd166,
};

// Diaper outfit: each diaper picked up adds the next piece.
export const STAGE_NAMES = [
  'NAKED BABY',
  'DIAPER!',
  'DIAPER HELMET!',
  'DIAPER CAPE!',
  'DIAPER MASK!',
  'DIAPER GLOVES!',
  'DIAPER BOOTS!',
  'DIAPER ARMOR!',
  'SUPER DIAPERMAN!',
];
export const MAX_STAGE = STAGE_NAMES.length - 1;
export const DIAPER_POINTS = 10;
export const DIAPER_POINTS_MAXED = 25; // extra diapers once fully suited up

// Power-ups (a floating item shows up every so often)
export const POWERUP_FIRST = 14;           // seconds into a run
export const POWERUP_EVERY = [20, 30];     // seconds between power-ups
export const GOLDEN_DIAPER_CHANCE = 0.25;  // otherwise it's a Sippy Cup Rocket
export const ROCKET_TIME = 4.5;            // seconds of flight
export const ROCKET_SPEED_MUL = 1.8;       // world speeds up while flying

// Surprise events
export const EVENT_FIRST = 28;             // seconds into a run
export const EVENT_EVERY = [28, 42];       // seconds between events
export const VACUUM_UNLOCK = 25;           // vacuum can only appear after this
export const VACUUM_CHANCE = 0.55;         // otherwise a diaper blowout
export const VACUUM_TIME = 8;              // survive this long to escape
export const VACUUM_SPEED_MUL = 1.15;
export const VACUUM_ESCAPE_POINTS = 50;

// Physics tuning
export const GRAVITY = 2400;
export const JUMP_VELOCITY = -950;
export const DOUBLE_JUMP_VELOCITY = -820;
export const START_SPEED = 320;
export const MAX_SPEED = 700;
export const SPEED_GAIN = 4; // px/s gained every second (top speed after ~1.5 min)

// Difficulty: when tougher obstacles start showing up (in seconds of play)
export const UNLOCK_TALL_TOWERS = 20;
export const UNLOCK_BEES = 30;
export const UNLOCK_WIDE_TOWERS = 45;
// Time between obstacles (seconds): starts relaxed, tightens slowly
export const GAP_MIN = 1.3;
export const GAP_MAX = 2.1;
export const GAP_SQUEEZE_MAX = 0.4;   // gaps shrink by up to this much...
export const GAP_SQUEEZE_TIME = 120;  // ...reached after this many seconds

// Online leaderboard (Firebase). Leave empty to play without it.
// Paste the "firebaseConfig" values from the Firebase console here.
// These are meant to be public: the security rules protect the data.
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCK3rMq885GseXGdkx__yx1xtAqzlL5f2Q',
  authDomain: 'diaperman-711e3.firebaseapp.com',
  projectId: 'diaperman-711e3',
  appId: '1:546166374701:web:115ffc45099af0088053a4',
};

// Saved best score (wrapped: storage can be blocked in private browsing)
export function loadBest() {
  try { return Number(localStorage.getItem('diaperman.best')) || 0; } catch { return 0; }
}
export function saveBest(v) {
  try { localStorage.setItem('diaperman.best', String(v)); } catch { /* ignore */ }
}

export function textStyle(size, color = '#ffffff') {
  return {
    fontFamily: FONT,
    fontSize: `${size}px`,
    fontStyle: 'bold',
    color,
    stroke: '#1d3557',
    strokeThickness: Math.max(4, Math.round(size / 7)),
    align: 'center',
  };
}
