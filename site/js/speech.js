// Read-aloud narration using the browser's built-in voices.
const synth = window.speechSynthesis;
let voice = null;

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

export const canSpeak = !!synth;

/** Turn the HTML we show on screen into plain words worth saying. */
export function plain(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}⭐]/gu, '')
    .replace(/m\/s²/g, 'meters per second squared')
    .replace(/km\/s/g, 'kilometers per second')
    .replace(/×/g, ' times ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function speak(html, { onstart, onend } = {}) {
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(plain(html));
  if (voice) u.voice = voice;
  u.rate = 1.02;
  u.pitch = 1.15;
  u.onstart = () => onstart?.();
  u.onend = u.onerror = () => onend?.();
  synth.speak(u);
}

export function hush() {
  synth?.cancel();
}
