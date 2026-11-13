// All sound is synthesised with Web Audio: no audio files to download.
import { state } from './store.js';

let ac = null;
let master = null;
let musicGain = null;
let musicTimer = null;

function ctx() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0.5;
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

/** Call from a user gesture so browsers allow sound. */
export function unlock() {
  ctx();
  if (state.music) startMusic();
}

function tone(freq, dur, { type = 'sine', vol = 0.3, to = null, delay = 0, dest = null } = {}) {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest || master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur, { vol = 0.3, from = 800, to = 200, delay = 0 } = {}) {
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + delay;
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

const sounds = {
  click: () => tone(660, 0.07, { type: 'triangle', vol: 0.2 }),
  pop: () => tone(420, 0.12, { to: 900, vol: 0.25 }),
  whoosh: () => noise(0.5, { from: 300, to: 3000, vol: 0.2 }),
  launch: () => { noise(0.7, { from: 2500, to: 150, vol: 0.3 }); tone(120, 0.6, { type: 'sawtooth', to: 500, vol: 0.12 }); },
  thud: () => { noise(0.25, { from: 500, to: 60, vol: 0.5 }); tone(90, 0.25, { to: 40, vol: 0.4 }); },
  soft: () => noise(0.12, { from: 900, to: 300, vol: 0.08 }),
  boing: () => tone(180, 0.35, { type: 'square', to: 520, vol: 0.12 }),
  ding: () => { tone(1320, 0.5, { vol: 0.25 }); tone(1980, 0.4, { vol: 0.12, delay: 0.04 }); },
  coin: () => { tone(988, 0.08, { type: 'square', vol: 0.12 }); tone(1319, 0.3, { type: 'square', vol: 0.12, delay: 0.08 }); },
  wrong: () => { tone(220, 0.18, { type: 'sawtooth', vol: 0.12 }); tone(165, 0.3, { type: 'sawtooth', vol: 0.12, delay: 0.15 }); },
  crash: () => { noise(0.6, { from: 3000, to: 80, vol: 0.5 }); tone(140, 0.5, { type: 'sawtooth', to: 35, vol: 0.25 }); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, { type: 'triangle', vol: 0.25, delay: i * 0.1 })),
  star: () => [784, 988, 1175, 1568, 2093].forEach((f, i) => tone(f, 0.35, { type: 'triangle', vol: 0.25, delay: i * 0.09 })),
  slurp: () => tone(700, 0.9, { type: 'sawtooth', to: 40, vol: 0.2 }),
  tick: () => tone(1500, 0.03, { type: 'square', vol: 0.06 }),
};

export function sfx(name) {
  if (!state.sfx || !sounds[name]) return;
  try { sounds[name](); } catch { /* sound is never worth breaking the game for */ }
}

/** A rising "chirp" like the one LIGO hears when two black holes merge. */
export function chirp(seconds = 2.2, f0 = 35, f1 = 420) {
  if (!state.sfx) return;
  const a = ctx();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  // Frequency rises slowly, then shoots up at the end, as in a real inspiral.
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const x = i / steps;
    const f = f0 * Math.pow(1 - 0.985 * x, -3 / 8);
    o.frequency.linearRampToValueAtTime(Math.min(f, f1), t + x * seconds);
    g.gain.linearRampToValueAtTime(0.05 + 0.4 * x * x, t + x * seconds);
  }
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds + 0.25);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + seconds + 0.3);
}

// ---- gentle generative space music ----
const SCALE = [0, 2, 4, 7, 9]; // major pentatonic: any notes sound fine together
const CHORDS = [[0, 7, 16], [-3, 4, 12], [-7, 0, 9], [-5, 2, 11]];
let bar = 0;

function note(semi) {
  return 220 * Math.pow(2, semi / 12);
}

function playBar() {
  const a = ctx();
  if (!a || !musicGain) return;
  const chord = CHORDS[bar % CHORDS.length];
  for (const s of chord) {
    tone(note(s - 12), 4.4, { vol: 0.1, dest: musicGain });
    tone(note(s - 12) * 1.003, 4.4, { type: 'triangle', vol: 0.05, dest: musicGain });
  }
  for (let i = 0; i < 8; i++) {
    if (Math.random() < 0.55) {
      const s = SCALE[Math.floor(Math.random() * SCALE.length)] + 12 * Math.floor(Math.random() * 2);
      tone(note(s), 0.9, { type: 'sine', vol: 0.07, delay: i * 0.5, dest: musicGain });
    }
  }
  bar++;
}

export function startMusic() {
  const a = ctx();
  if (!a || musicTimer) return;
  musicGain = a.createGain();
  musicGain.gain.value = 0.55;
  musicGain.connect(master);
  playBar();
  musicTimer = setInterval(playBar, 4000);
}

export function stopMusic() {
  clearInterval(musicTimer);
  musicTimer = null;
  if (musicGain) {
    const g = musicGain;
    g.gain.setTargetAtTime(0, ac.currentTime, 0.2);
    setTimeout(() => g.disconnect(), 1500);
    musicGain = null;
  }
}

/** A short beep at any pitch, for sounds that track something on screen. */
export function blip(freq, dur = 0.08, vol = 0.12) {
  if (!state.sfx) return;
  try { tone(freq, dur, { type: 'triangle', vol }); } catch { /* ignore */ }
}
