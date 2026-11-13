// Browser smoke test: loads the app, opens every mission and every part of it,
// and fails on any console error or uncaught exception.
// Usage: node tests/smoke.mjs [screenshot-dir]
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../site');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const file = path.join(root, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/`;
const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('fonts.g')) errors.push(`console: ${m.text()}`); });
const snap = async (name) => { if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`) }); };

await page.goto(url);
await snap('00-welcome');
await page.fill('input', 'Tester');
await page.click('text=Launch!');
await page.waitForSelector('.missions');
await snap('01-map');
const ids = await page.$$eval('.mission', (els) => els.length);
let stagesSeen = 0;
for (let i = 0; i < ids; i++) {
  await page.goto(url + '#/map');
  await page.locator('.mission').nth(i).click();
  await page.waitForSelector('.pips');
  const parts = await page.locator('.pip').count();
  for (let s = 0; s < parts; s++) {
    await page.locator('.pip').nth(s).click();
    await page.waitForTimeout(700);
    await snap(`${String(i + 1).padStart(2, '0')}-${s + 1}`);
    stagesSeen++;
  }
}
await browser.close();
server.close();
console.log(`${ids} missions, ${stagesSeen} parts opened, ${errors.length} errors`);
for (const e of errors) console.log('  ' + e);
process.exit(errors.length || ids !== 8 ? 1 : 0);
