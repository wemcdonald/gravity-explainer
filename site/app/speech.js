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
const LIST_PAUSE_MS = 650; // gap between quiz answers when they are read as a list
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
      // One shared element: phones only let audio start from a tap, but an
      // element that has been started by a tap may keep playing later clips.
      player ||= new Audio();
      player.onended = player.onerror = done;
      player.src = `audio/${file}`;
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
  if (player) { player.onended = player.onerror = null; player.pause(); }
  finish?.();
  finish = null;
}

/** Say one HTML string, or an array of them one after another. Replaces anything already being said. */
export async function speak(html, { onstart, onend } = {}) {
  stop();
  const mine = turn;
  onstart?.();
  const lines = [].concat(html).map(plain).filter(Boolean);
  for (let i = 0; i < lines.length && mine === turn; i++) {
    // a beat between items, so a question and its answers don't run together
    if (i) await new Promise((r) => setTimeout(r, i === 1 ? LIST_PAUSE_MS + 250 : LIST_PAUSE_MS));
    if (mine === turn) await sayOne(lines[i]);
  }
  onend?.();
}

export function hush() {
  stop();
}
