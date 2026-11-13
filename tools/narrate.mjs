// Pre-records the app's narration with a high-quality text-to-speech service
// and writes site/audio/<hash>.mp3 plus site/audio/manifest.json (text -> file).
// The browser plays these files; the API key never leaves this machine.
//
//   node tools/narrate.mjs            record anything missing, drop anything stale
//   node tools/narrate.mjs --list     show what would be recorded, no network
//   node tools/narrate.mjs --check    exit 1 unless every line has a recording
//   node tools/narrate.mjs --redo     re-record everything
//   node tools/narrate.mjs --voice ID  use this voice (overrides .env and the default)
//
// File names include the service, model and voice, so choosing another voice
// records a fresh set and removes the old one; no --redo needed.
//
// Reads keys from the environment or from a git-ignored .env in the repo root:
//   ELEVENLABS_API_KEY=...   (optional ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL)
//   OPENAI_API_KEY=...       (optional OPENAI_TTS_VOICE, OPENAI_TTS_MODEL)
// If both are set, ElevenLabs is used unless TTS_PROVIDER=openai.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { LEVELS, QUIZ_INTRO } from '../site/js/levels/index.js';
import { plain } from '../site/js/narration-text.js';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'site/audio');
const manifestPath = path.join(outDir, 'manifest.json');
const argv = process.argv.slice(2);
const flags = new Set(argv);
const voiceArg = argv.includes('--voice') ? argv[argv.indexOf('--voice') + 1] : null;
if (argv.includes('--voice') && (!voiceArg || voiceArg.startsWith('--'))) { console.error('--voice needs a voice ID'); process.exit(2); }

const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

/** Every fixed line the app can read aloud: Newt's intros, quiz questions, answers and explanations. */
export function narrationLines() {
  const lines = new Set([plain(QUIZ_INTRO)]);
  for (const level of LEVELS) {
    for (const stage of level.stages) lines.add(plain(stage.say));
    for (const q of level.quiz) { lines.add(plain(q.q)); lines.add(plain(q.why)); q.opts.forEach((o) => lines.add(plain(o))); }
  }
  lines.delete('');
  return [...lines];
}

const STYLE = 'A warm, upbeat science guide talking to a curious 10-year-old. Clear and friendly, lively but not babyish, medium pace.';
const name = process.env.TTS_PROVIDER || (process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : process.env.OPENAI_API_KEY ? 'openai' : 'elevenlabs');
// The chosen voice: --voice, then .env / environment, then the project default.
const DEFAULT_VOICE = { elevenlabs: 'xd8j2LFPw16XKmJ5qeBK', openai: 'coral' };
const voice = voiceArg || (name === 'openai' ? process.env.OPENAI_TTS_VOICE : process.env.ELEVENLABS_VOICE_ID) || DEFAULT_VOICE[name];
const model = name === 'openai' ? process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts' : process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const providers = {
  elevenlabs: async (text) => {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ text, model_id: model }),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return Buffer.from(await res.arrayBuffer());
  },
  openai: async (text) => {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model, voice, input: text, instructions: STYLE, response_format: 'mp3' }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return Buffer.from(await res.arrayBuffer());
  },
};

const lines = narrationLines();
const fileFor = (text) => `${crypto.createHash('sha1').update(`${name}|${model}|${voice}|${text}`).digest('hex').slice(0, 12)}.mp3`;
const chars = lines.reduce((n, l) => n + l.length, 0);
const have = (text) => fs.existsSync(path.join(outDir, fileFor(text)));

if (flags.has('--list')) {
  console.log(`${lines.length} lines, ${chars} characters; ${lines.filter(have).length} already recorded with ${name} voice ${voice}`);
  process.exit(0);
}
if (flags.has('--check')) {
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
  const missing = lines.filter((l) => !manifest[l] || !have(l));
  console.log(missing.length ? `${missing.length} of ${lines.length} narration lines have no recording, e.g. "${missing[0]}"` : `all ${lines.length} narration lines are recorded`);
  process.exit(missing.length ? 1 : 0);
}

if (!providers[name] || !process.env[name === 'openai' ? 'OPENAI_API_KEY' : 'ELEVENLABS_API_KEY']) {
  console.error('No text-to-speech key found. Put ELEVENLABS_API_KEY=... or OPENAI_API_KEY=... in .env (git-ignored) and run again.');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });
const todo = flags.has('--redo') ? lines : lines.filter((l) => !have(l));
console.log(`${name} (${model}, voice ${voice}): recording ${todo.length} of ${lines.length} lines (${todo.reduce((n, l) => n + l.length, 0)} characters)`);
let made = 0;
for (const text of todo) {
  try {
    const mp3 = await providers[name](text);
    if (mp3.length < 500) throw new Error(`suspiciously small audio (${mp3.length} bytes)`);
    fs.writeFileSync(path.join(outDir, fileFor(text)), mp3);
    made++;
  } catch (e) {
    console.error(`FAILED "${text.slice(0, 50)}…": ${e.message}`);
    if (made === 0) { console.error('First request failed, stopping so nothing is wasted.'); process.exit(1); }
  }
}
// manifest lists only lines that really have a file; stale files are removed
const manifest = Object.fromEntries(lines.filter(have).map((l) => [l, fileFor(l)]));
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
const keep = new Set([...Object.values(manifest), 'manifest.json']);
const stale = fs.readdirSync(outDir).filter((f) => !keep.has(f));
stale.forEach((f) => fs.unlinkSync(path.join(outDir, f)));
const missing = lines.length - Object.keys(manifest).length;
console.log(`recorded ${made}, removed ${stale.length} stale, ${Object.keys(manifest).length}/${lines.length} lines have audio`);
process.exit(missing ? 1 : 0);
