// Read-aloud narration. Lines that have a pre-recorded file (see
// tools/narrate.mjs and audio/manifest.json) play that; anything else falls
// back to the browser's built-in voice.
import { plain } from './narration-text.js';

export { plain };

const synth = window.speechSynthesis;
let voice = null;
let recorded = {}; // plain text -> file name in audio/
let player = null; // the <audio> currently playing
let turn = 0; // bumps whenever speech is replaced or hushed, cancelling older queues
let finish = null; // resolves the line being said right now

fetch('audio/manifest.json').then((r) => (r.ok ? r.json() : {})).then((m) => { recorded = m; }).catch(() => {});

function pickVoice() {
  if (!synth) return;
  const voices = synth.getVoices().filter((v) => v.lang && v.lang.startsWith('en'));
  const prefer = ['Samantha', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Karen', 'Daniel', 'Google UK English Female'];
  voice = prefer.map((n) => voices.find((v) => v.name.includes(n))).find(Boolean) || voices[0] || null;
}
if (synth) {
  pickVoice();
  synth.addEventListener?.('voiceschanged', pickVoice);
}

/** Say one line; resolves when it finishes, fails, or is interrupted by stop(). */
function sayOne(text) {
  return new Promise((done) => {
    finish = done;
    const file = recorded[text];
    if (file) {
      player = new Audio(`audio/${file}`);
      player.onended = player.onerror = done;
      player.play().catch(done);
    } else if (synth) {
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.rate = 1.02;
      u.pitch = 1.15;
      u.onend = u.onerror = done;
      synth.speak(u);
    } else done();
  });
}

function stop() {
  turn++;
  synth?.cancel();
  if (player) { player.pause(); player = null; }
  finish?.();
  finish = null;
}

/** Say one HTML string, or an array of them one after another. Replaces anything already being said. */
export async function speak(html, { onstart, onend } = {}) {
  stop();
  const mine = turn;
  onstart?.();
  for (const line of [].concat(html)) {
    if (mine !== turn) break;
    const text = plain(line);
    if (text) await sayOne(text);
  }
  onend?.();
}

export function hush() {
  stop();
}
