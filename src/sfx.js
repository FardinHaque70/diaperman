// Tiny synthesized sound effects (no audio files needed).
// Phones only allow sound after the player taps, so call unlockAudio() on tap.
let ctx = null;
let muted = false;
try { muted = localStorage.getItem('diaperman.muted') === '1'; } catch { /* ignore */ }

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function isMuted() { return muted; }
export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('diaperman.muted', muted ? '1' : '0'); } catch { /* ignore */ }
  return muted;
}

function tone(freq, dur, { type = 'square', vol = 0.07, slideTo = null, delay = 0 } = {}) {
  if (muted || !ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  jump: () => tone(440, 0.14, { slideTo: 780 }),
  doubleJump: () => tone(660, 0.16, { slideTo: 1200, type: 'triangle', vol: 0.09 }),
  pickup: () => { tone(988, 0.08, { type: 'triangle', vol: 0.1 }); tone(1480, 0.12, { type: 'triangle', vol: 0.1, delay: 0.06 }); },
  // wobbly "blub-blub" raspberry
  blub: () => {
    tone(170, 0.09, { type: 'sine', vol: 0.2, slideTo: 380 });
    tone(150, 0.09, { type: 'sine', vol: 0.17, slideTo: 340, delay: 0.09 });
    tone(130, 0.12, { type: 'sine', vol: 0.14, slideTo: 300, delay: 0.18 });
  },
  pop: () => tone(1100, 0.05, { type: 'triangle', vol: 0.05, slideTo: 1800 }),
  rocket: () => {
    tone(120, 0.5, { type: 'sawtooth', vol: 0.07, slideTo: 900 });
    tone(240, 0.5, { type: 'triangle', vol: 0.08, slideTo: 1400, delay: 0.05 });
  },
  rocketHum: () => tone(85, 0.22, { type: 'sawtooth', vol: 0.035, slideTo: 95 }),
  rocketEnd: () => tone(700, 0.35, { type: 'triangle', vol: 0.08, slideTo: 150 }),
  smash: () => { tone(220, 0.12, { type: 'square', vol: 0.08, slideTo: 60 }); tone(880, 0.06, { type: 'triangle', vol: 0.06, delay: 0.02 }); },
  // "pbbbbt" for the diaper blowout
  blowout: () => {
    for (let i = 0; i < 14; i++) tone(i % 2 ? 72 : 96, 0.045, { type: 'sawtooth', vol: 0.12, delay: i * 0.035 });
    tone(300, 0.4, { type: 'triangle', vol: 0.08, slideTo: 1200, delay: 0.45 });
  },
  vacuum: () => { tone(70, 0.45, { type: 'sawtooth', vol: 0.05, slideTo: 82 }); tone(140, 0.45, { type: 'square', vol: 0.02, slideTo: 150 }); },
  escaped: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, { type: 'triangle', vol: 0.1, delay: i * 0.07 })); },
  ouch: () => { tone(620, 0.12, { type: 'square', vol: 0.08, slideTo: 300 }); tone(420, 0.16, { type: 'square', vol: 0.07, slideTo: 180, delay: 0.1 }); },
  hit: () => { tone(260, 0.4, { type: 'sawtooth', vol: 0.09, slideTo: 60 }); },
  suitUp: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.1, { type: 'triangle', vol: 0.1, delay: i * 0.06 })); },
  fullSuit: () => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i === 6 ? 0.35 : 0.1, { type: 'square', vol: 0.07, delay: i * 0.08 })); },
  start: () => { tone(523, 0.08, { type: 'triangle' }); tone(659, 0.08, { type: 'triangle', delay: 0.08 }); tone(784, 0.14, { type: 'triangle', delay: 0.16 }); },
};
