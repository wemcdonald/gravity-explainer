// Plays the game in a real browser and checks that stars can actually be earned.
// Usage: node tests/play.mjs [mission-id ...]   (no ids = every mission it knows)
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { STAGES, simulate, MAX_SPEED, MIN_SPEED } from '../site/app/slingshot-core.js';
import { traceRay, RAYS } from '../site/app/levels/bendy.js';

const root = path.resolve(import.meta.dirname, '../site');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const file = path.join(root, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('fonts.g')) errors.push(`console: ${m.text()}`); });

const results = [];
const star = (level, id) => page.evaluate(([l, s]) => !!JSON.parse(localStorage.getItem('gravity-quest-v1') || '{}').stars?.[l]?.[s], [level, id]);
async function expectStar(level, id, timeout = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { if (await star(level, id)) break; await page.waitForTimeout(250); }
  const ok = await star(level, id);
  results.push({ level, id, ok, secs: ((Date.now() - t0) / 1000).toFixed(1) });
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${level}.${id} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  return ok;
}
const open = async (id, part = 0) => {
  await page.goto(`${url}#/level/${id}`);
  await page.waitForSelector('.pips');
  if (part) await page.locator('.pip').nth(part).click();
  await page.waitForTimeout(300);
};
/** Logical canvas coordinates -> page coordinates. */
async function at(x, y, W, H) {
  const box = await page.locator('.sim canvas').boundingBox();
  return [box.x + (x * box.width) / W, box.y + (y * box.height) / H];
}
async function drag(from, to, W, H, steps = 8) {
  const [ax, ay] = await at(from[0], from[1], W, H), [bx, by] = await at(to[0], to[1], W, H);
  await page.mouse.move(ax, ay); await page.mouse.down();
  await page.mouse.move(bx, by, { steps }); await page.mouse.up();
}
const setRange = (nth, value) => page.locator('input[type=range]').nth(nth).evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, value);
const chip = (text) => page.locator('.chip', { hasText: text }).first().click();

const plays = {
  async drop() {
    await open('drop');
    const pickRow = async (row, n) => page.locator('.controls').first().locator('.group').nth(row).locator('.chip').nth(n).click();
    // 1: ball vs feather in the no-air chamber -> same time
    await chip('No-air chamber'); await page.click('text=Same time'); await page.waitForSelector('text=Drop again', { timeout: 15000 }); await page.click('text=Drop again');
    // 2: ball vs feather on Earth -> ball (left) first
    await chip('Earth'); await page.locator('.btn.small').first().click(); await page.waitForSelector('text=Drop again', { timeout: 20000 }); await page.click('text=Drop again');
    // 3: hammer vs feather on the Moon -> same time
    await pickRow(0, 1); await chip('Moon'); await page.click('text=Same time'); await page.waitForSelector('text=Drop again', { timeout: 20000 });
    await expectStar('drop', 'predict', 3000);
    await expectStar('drop', 'moon', 3000);
  },
  async hop() {
    await open('hop');
    for (const [world, wait] of [['Mars', 2500], ['Moon', 5000], ['Pluto', 11500]]) { await chip(world); await page.locator('.btn.go').click(); await page.waitForTimeout(wait); }
    await expectStar('hop', 'grab', 3000);
    await open('hop', 1);
    for (const w of ['Pluto', 'Moon', 'Mars', 'Earth', 'Jupiter']) await page.locator('.mission', { hasText: w }).click();
    await expectStar('hop', 'weigh', 3000);
  },
  async pull() {
    await open('pull');
    await setRange(2, 2); await page.waitForTimeout(1300);
    await setRange(1, 8); await page.waitForTimeout(1300);
    await page.locator('.panel .btn', { hasText: /^1$/ }).click();
    await expectStar('pull', 'force', 3000);
    await open('pull', 1);
    await expectStar('pull', 'planet', 90000);
  },
  async cannon() {
    await open('cannon');
    await setRange(0, 7.6); await page.locator('.btn.danger').click();
    await expectStar('cannon', 'orbit', 40000);
    await setRange(0, 11.5); await page.locator('.btn.danger').click();
    await expectStar('cannon', 'pro', 60000);
  },
  async slingshot() {
    await open('slingshot');
    for (let i = 0; i < STAGES.length; i++) {
      // middle of the widest winning window for this stage
      let best = null;
      for (let speed = MIN_SPEED; speed <= MAX_SPEED; speed += 10) {
        let run = [];
        for (let deg = 0; deg <= 360; deg += 0.5) {
          const a = (deg * Math.PI) / 180;
          if (deg < 360 && simulate(STAGES[i], Math.cos(a) * speed, Math.sin(a) * speed) === 'hit') run.push(deg);
          else { if (!best || run.length > best.n) best = { n: run.length, speed, deg: run[Math.floor(run.length / 2)] }; run = []; }
        }
      }
      const a = (best.deg * Math.PI) / 180, pull = best.speed / 2.5;
      await page.waitForFunction((n) => document.querySelector('.controls .readout')?.textContent.startsWith(`Stage ${n} `), i + 1, { timeout: 30000 });
      await drag([400, 250], [400 - Math.cos(a) * pull, 250 - Math.sin(a) * pull], 800, 500);
      await page.waitForTimeout(600);
      if (i === 2) await expectStar('slingshot', 'half', 25000);
    }
    await expectStar('slingshot', 'all', 25000);
  },
  async bendy() {
    await open('bendy');
    // same projection as the sheet, for mass slider value 5
    const M = 5, S = 45;
    const depth = (X, Y) => (14 * M * S) / Math.sqrt(X * X + Y * Y + S * S);
    const proj = (X, Y) => [400 + X * (0.78 + (0.22 * (Y + 220)) / 440), 105 + (Y + 220) * 0.62 + depth(X, Y)];
    // start 130 to the right of the middle, pull back 45 "up" so it launches "down" at ~90 px/s
    await drag(proj(130, 0), proj(130, -45), 800, 500);
    await expectStar('bendy', 'orbit', 30000);
    await open('bendy', 1);
    let spot = null;
    for (let x = 150; x <= 650 && !spot; x += 10) for (let y = 40; y <= 420; y += 5) {
      const hits = (px, py) => RAYS.some((r) => traceRay(r, { x: px, y: py }, 7, 16).miss < 20);
      if (hits(x, y) && hits(x + 4, y) && hits(x - 4, y) && hits(x, y + 4) && hits(x, y - 4)) { spot = [x, y]; break; }
    }
    if (!spot) { console.log('FAIL bendy.lens: no lens position bends light into the telescope'); results.push({ level: 'bendy', id: 'lens', ok: false }); return; }
    const [px, py] = await at(spot[0], spot[1], 800, 460);
    await page.mouse.move(px, py); await page.mouse.down(); await page.waitForTimeout(1500); await page.mouse.up();
    await expectStar('bendy', 'lens', 5000);
  },
  async blackhole() {
    await open('blackhole');
    for (const thing of ['Earth', 'Moon']) {
      await chip(thing);
      const box = await page.locator('.btn.danger').boundingBox();
      await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down(); await page.waitForTimeout(4300); await page.mouse.up();
    }
    await expectStar('blackhole', 'squish', 3000);
    // Horizon Run: hold the pointer at each orb's distance until the ship sweeps through it
    await open('blackhole', 1);
    for (const r of [170, 125, 95, 66, 50]) {
      const [px, py] = await at(400 + r, 250, 800, 500);
      await page.mouse.move(px, py); await page.mouse.down(); await page.waitForTimeout(r > 100 ? 9000 : 4000); await page.mouse.up();
    }
    await expectStar('blackhole', 'run', 5000);
  },
  async waves() {
    await open('waves');
    await page.locator('.btn.danger').click(); await page.waitForTimeout(7000);
    await page.locator('.chip', { hasText: 'HUGE' }).first().click();
    await page.locator('.btn.danger').click();
    await expectStar('waves', 'chirp', 8000);
    await open('waves', 1);
    for (let i = 0; i < 4; i++) await page.locator('.grid2 .mission').nth(i).click();
    await expectStar('waves', 'mystery', 3000);
  },
  /** The quiz is the same code for every mission, so one run covers it. */
  async quiz() {
    await open('drop', 1);
    for (let q = 0; q < 3; q++) {
      await page.locator('.opt', { hasText: ['same time', 'Air pushes', 'Falls farther'][q] }).click();
      await page.locator('.why .btn').click();
    }
    await expectStar('drop', 'quiz', 3000);
  },
  /** Reading a quiz question aloud plays its recording, then each answer in the order shown. */
  async narration() {
    const q = 'In a room with NO air, you drop a feather and a bowling ball. What happens?';
    const opts = ['They land at the same time', 'The bowling ball lands first', 'The feather floats up'];
    const manifest = { [q]: 'q.mp3', [opts[0]]: 'o0.mp3', [opts[1]]: 'o1.mp3', [opts[2]]: 'o2.mp3' };
    const asked = [];
    await page.route('**/audio/manifest.json', (r) => r.fulfill({ json: manifest }));
    // no real audio in the test: serve empty files so each fails fast and the queue moves on
    await page.route('**/audio/*.mp3', (r) => { asked.push(r.request().url().split('/').pop()); r.fulfill({ status: 200, contentType: 'audio/mpeg', body: '' }); });
    await page.goto(url + '#/map'); await page.reload();
    await open('drop', 1);
    const shown = await page.locator('.opt').allTextContents();
    await page.locator('.say-inline').click();
    await page.waitForTimeout(4500); // includes the pauses between answers
    const want = ['q.mp3', ...shown.map((t) => manifest[t])];
    const ok = JSON.stringify(asked) === JSON.stringify(want);
    results.push({ level: 'narration', id: 'order', ok });
    console.log(`${ok ? 'ok  ' : 'FAIL'} narration plays ${asked.join(', ') || 'nothing'} (wanted ${want.join(', ')})`);
    await page.unroute('**/audio/manifest.json'); await page.unroute('**/audio/*.mp3');
  },
};

await page.goto(url);
await page.fill('input', 'Tester');
await page.click('text=Launch!');
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(plays);
for (const id of wanted) {
  try { await plays[id](); } catch (e) { console.log(`FAIL ${id}: ${e.message.split('\n')[0]}`); results.push({ level: id, id: 'exception', ok: false }); }
}
await browser.close();
server.close();
for (const e of errors) console.log('  ' + e);
const bad = results.filter((r) => !r.ok).length + errors.length;
console.log(bad ? `${bad} problem(s)` : `all ${results.length} stars earned, no errors`);
process.exit(bad ? 1 : 0);
