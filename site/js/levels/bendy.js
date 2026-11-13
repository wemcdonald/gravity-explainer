// Mission 6: Einstein's picture. Mass bends space, and everything (even light) follows the bends.
import { h, makeSim, slider, chips, text, drawStars, ball, toast, TAU, clamp } from '../ui.js';
import { sfx } from '../audio.js';

// ---------- stage 1: the rubber sheet ----------
function sheetStage(el, c) {
  const sim = makeSim(el, 800, 500);
  const { ctx, W, H } = sim;
  let M = 5;
  let marbles = [];
  let aim = null; // {from:{X,Y}, to:{X,Y}}
  const seen = new Set();
  const say = (k, html) => { if (!seen.has(k)) { seen.add(k); c.whoa(html); } };
  const S = 45, G0 = 194400;

  const depth = (X, Y) => (14 * M * S) / Math.sqrt(X * X + Y * Y + S * S);
  const widen = (Y) => 0.78 + (0.22 * (Y + 220)) / 440;
  const proj = (X, Y) => [400 + X * widen(Y), 105 + (Y + 220) * 0.62 + depth(X, Y)];
  const unproj = (p) => {
    let X = 0, Y = 0;
    for (let i = 0; i < 6; i++) {
      Y = (p.y - 105 - depth(X, Y)) / 0.62 - 220;
      X = (p.x - 400) / widen(Y);
    }
    return { X, Y };
  };

  const label = h('span', { class: 'big-num' });
  const names = ['nothing', 'a moon', 'a planet', 'a planet', 'a big planet', 'a star', 'a star', 'a giant star', 'a giant star', 'a neutron star', 'a black hole'];
  const paint = () => { label.textContent = names[M]; };
  el.append(h('div', { class: 'controls' }, h('span', { class: 'group-label' }, 'In the middle'), label),
    h('div', { class: 'controls' }, h('label', {}, 'lighter'), slider({ min: 0, max: 10, value: M, oninput: (v) => { M = v; sfx('tick'); paint(); if (M === 0) say('flat', '<strong>No mass, no bend.</strong> On flat space, marbles roll in perfectly straight lines forever.'); } }), h('label', {}, 'heavier'),
      h('button', { class: 'btn small secondary', onclick: () => { marbles = []; sfx('pop'); } }, '🧹 Clear marbles')));
  paint();

  sim.pointer({
    down: (p) => { const q = unproj(p); aim = { from: q, to: q }; },
    move: (p, e, active) => { if (active && aim) aim.to = unproj(p); },
    up: () => {
      if (!aim) return;
      const dx = aim.from.X - aim.to.X, dy = aim.from.Y - aim.to.Y;
      const pull = Math.hypot(dx, dy);
      if (pull > 6) {
        const sp = Math.min(260, pull * 2);
        marbles.push({ X: aim.from.X, Y: aim.from.Y, vx: (dx / pull) * sp, vy: (dy / pull) * sp, angle: 0, trail: [], hue: 40 + marbles.length * 67, done: false });
        if (marbles.length > 6) marbles.shift();
        sfx('pop');
      }
      aim = null;
    },
  });

  function step(dt) {
    for (const m of marbles) {
      const d2 = m.X * m.X + m.Y * m.Y;
      const k = (-G0 * M) / Math.pow(d2 + 100, 1.5);
      m.vx += m.X * k * dt; m.vy += m.Y * k * dt;
      const px = m.X, py = m.Y;
      m.X += m.vx * dt; m.Y += m.vy * dt;
      m.angle += Math.atan2(px * m.Y - py * m.X, px * m.X + py * m.Y);
      if (M > 0 && Math.hypot(m.X, m.Y) < 9 + M * 1.5) { m.dead = true; sfx('soft'); }
      if (Math.abs(m.X) > 470 || Math.abs(m.Y) > 300) m.dead = true;
      if (!m.done && Math.abs(m.angle) >= TAU) {
        m.done = true; sfx('win');
        c.award('orbit');
        say('orbit', '<strong>Einstein’s big idea (1915):</strong> gravity isn’t really a pull. Mass <strong>bends space</strong>, and things simply follow the bends. Your marble thinks it’s going straight! The Earth circles the Sun the same way.');
      }
    }
    marbles = marbles.filter((m) => !m.dead);
  }

  sim.loop((dt) => {
    for (let i = 0; i < 4; i++) step(dt / 4);
    for (const m of marbles) { m.trail.push([m.X, m.Y]); if (m.trail.length > 260) m.trail.shift(); }
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, W, H);
    drawStars(ctx, W, 130, 61, 50);
    // the sheet: grid lines get brighter the deeper they dip
    ctx.lineWidth = 1.4;
    const seg = (x1, y1, x2, y2) => {
      const [ax, ay] = proj(x1, y1), [bx, by] = proj(x2, y2);
      const dip = depth((x1 + x2) / 2, (y1 + y2) / 2) / 140;
      ctx.strokeStyle = `hsl(${220 + dip * 110}, 85%, ${45 + dip * 25}%)`;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    };
    for (let X = -380; X <= 380; X += 38) for (let Y = -220; Y < 220; Y += 11) seg(X, Y, X, Y + 11);
    for (let Y = -220; Y <= 220; Y += 40) for (let X = -380; X < 380; X += 10) seg(X, Y, X + 10, Y);
    if (M > 0) {
      const [sx, sy] = proj(0, 0);
      const r = 9 + M * 1.5;
      if (M === 10) { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(sx, sy - r * 0.6, r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#ffb054'; ctx.lineWidth = 3; ctx.stroke(); }
      else ball(ctx, sx, sy - r * 0.6, r, M >= 5 ? '#fff3b0' : '#9fd4ff', M >= 5 ? '#e0820f' : '#1d5fae');
    }
    for (const m of marbles) {
      ctx.strokeStyle = `hsla(${m.hue},90%,70%,.55)`; ctx.lineWidth = 2; ctx.beginPath();
      m.trail.forEach(([X, Y], i) => { const [x, y] = proj(X, Y); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      const [x, y] = proj(m.X, m.Y);
      ball(ctx, x, y - 5, 6, '#fff', `hsl(${m.hue},90%,50%)`);
    }
    if (aim) {
      const [ax, ay] = proj(aim.from.X, aim.from.Y), [bx, by] = proj(aim.to.X, aim.to.Y);
      ctx.strokeStyle = '#ff8fd0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ball(ctx, ax, ay - 5, 6, '#fff', '#ff8fd0');
    }
    if (!marbles.length && !aim) text(ctx, '👆 Drag back anywhere on the sheet and let go to flick a marble', 400, 30, { size: 16, color: '#ffd166' });
  });
}

// ---------- stage 2: bending starlight ----------
const LENSES = { star: { label: '☀️ Star', km: 7, r: 16 }, giant: { label: '🟠 Giant star', km: 14, r: 22 }, hole: { label: '⚫ Black hole', km: 30, r: 11 } };
export const RAYS = [150, 175, 200, 225, 250];
export const SCOPE = { x: 760, y: 350 };

/** Trace one light ray past a lens. Returns the path and the closest it gets to the telescope. */
export function traceRay(y0, lens, km, lensR) {
  let x = 30, y = y0, vx = 1, vy = 0;
  const path = [[x, y]];
  let miss = Infinity;
  const ds = 2;
  for (let i = 0; i < 900; i++) {
    const dx = lens.x - x, dy = lens.y - y;
    const d = Math.hypot(dx, dy);
    if (d < lensR) return { path, miss, eaten: true };
    const a = km / (d * d);
    vx += (dx / d) * a * ds; vy += (dy / d) * a * ds;
    const n = Math.hypot(vx, vy); vx /= n; vy /= n; // light always travels at light speed
    x += vx * ds; y += vy * ds;
    if (i % 3 === 0) path.push([x, y]);
    miss = Math.min(miss, Math.hypot(x - SCOPE.x, y - SCOPE.y));
    if (x < -20 || x > 820 || y < -20 || y > 480) break;
  }
  path.push([x, y]);
  return { path, miss, eaten: false };
}

function lensStage(el, c) {
  const sim = makeSim(el, 800, 460);
  const { ctx, W, H } = sim;
  const lens = { x: 400, y: 70 };
  let kind = 'star';
  let dragging = false;
  let held = 0;
  let won = false;
  const pick = chips('Drag this into the light', Object.entries(LENSES).map(([value, l]) => ({ value, label: l.label })), kind, (v) => { kind = v; });
  el.append(h('div', { class: 'controls' }, pick.el));
  sim.pointer({
    down: (p) => { dragging = true; lens.x = clamp(p.x, 60, 700); lens.y = clamp(p.y, 30, 430); },
    move: (p, e, active) => { if (active && dragging) { lens.x = clamp(p.x, 60, 700); lens.y = clamp(p.y, 30, 430); } },
    up: () => { dragging = false; },
  });

  sim.loop((dt, t) => {
    const L = LENSES[kind];
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, W, H);
    drawStars(ctx, W, H, 77, 70);
    // space grid, pinched toward the mass
    ctx.strokeStyle = 'rgba(110,140,255,.22)'; ctx.lineWidth = 1;
    const warp = (x, y) => {
      const dx = lens.x - x, dy = lens.y - y, d = Math.hypot(dx, dy) + 1;
      const pull = Math.min(d * 0.8, (L.km * 110) / (d + 30));
      return [x + (dx / d) * pull, y + (dy / d) * pull];
    };
    for (let x = 0; x <= W; x += 40) { ctx.beginPath(); for (let y = 0; y <= H; y += 10) { const [a, b] = warp(x, y); y ? ctx.lineTo(a, b) : ctx.moveTo(a, b); } ctx.stroke(); }
    for (let y = 0; y <= H; y += 40) { ctx.beginPath(); for (let x = 0; x <= W; x += 10) { const [a, b] = warp(x, y); x ? ctx.lineTo(a, b) : ctx.moveTo(a, b); } ctx.stroke(); }

    let hit = false;
    ctx.lineWidth = 3; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 260;
    for (const y0 of RAYS) {
      const ray = traceRay(y0, lens, L.km, L.r);
      const ok = ray.miss < 20;
      hit ||= ok;
      ctx.strokeStyle = ok ? '#5be3a0' : '#ffe98a';
      ctx.beginPath(); ray.path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    }
    ctx.setLineDash([]);
    text(ctx, '🌌', 28, 200, { size: 40 });
    text(ctx, 'far-away galaxy', 14, 268, { size: 13, color: '#cfd6ff', align: 'left' });
    text(ctx, '🔭', SCOPE.x, SCOPE.y, { size: 40 });
    text(ctx, hit ? 'I can see it!' : 'can’t see the galaxy…', SCOPE.x + 26, SCOPE.y + 36, { size: 13, color: hit ? '#5be3a0' : '#cfd6ff', align: 'right' });
    if (kind === 'hole') { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(lens.x, lens.y, L.r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#ffb054'; ctx.lineWidth = 3; ctx.stroke(); }
    else ball(ctx, lens.x, lens.y, L.r, '#fff3b0', kind === 'star' ? '#e0820f' : '#d2441a');

    held = hit ? held + dt : 0;
    if (hit && held > 0.7 && !won) {
      won = true; sfx('win'); toast('🔭 The telescope can see the galaxy!');
      c.award('lens');
      c.whoa('<strong>Light has no mass, but it still bends!</strong> That can’t happen if gravity is just a pull on stuff. But if <strong>space itself is bent</strong>, light has to follow. In 1919, astronomers measured starlight bending around the Sun during an eclipse, and Einstein became world-famous overnight.');
      c.whoa('<strong>Gravity bends TIME too.</strong> Clocks tick slower where gravity is stronger. GPS satellites high above Earth run about 38 millionths of a second fast every day, and your phone’s map has to correct for it or it would be off by miles!');
    }
  });
}

export default {
  id: 'bendy', title: 'Bendy Space', icon: '🌀', color: '#b48cff',
  tagline: 'Einstein’s wild idea: space itself can bend.',
  stars: [
    { id: 'orbit', label: 'Flick a marble so it makes a full loop around the middle' },
    { id: 'lens', label: 'Bend starlight into the telescope' },
    { id: 'quiz', label: 'Finish the quiz' },
  ],
  stages: [
    {
      say: 'Newton’s math works great, but he never knew <b>how</b> gravity reaches across empty space. Albert Einstein’s answer: space is like a stretchy sheet, and <b>mass makes a dent in it</b>. Flick some marbles!',
      goals: ['orbit'], build: sheetStage,
    },
    {
      say: 'Here’s the test. Light weighs nothing, so Newton’s pull shouldn’t bend it much. But if <b>space</b> is bent, light must follow the curve. Drag the star to bend the galaxy’s light into the telescope.',
      goals: ['lens'], build: lensStage,
    },
  ],
  quiz: [
    { q: 'According to Einstein, what is gravity?', opts: ['Mass bending space and time', 'An invisible rope between objects', 'Air pressure pushing down'], a: 0, why: 'Mass tells space how to bend, and bent space tells things how to move.' },
    { q: 'Can gravity bend light?', opts: ['Yes, light follows the curves in space', 'No, light has no mass', 'Only blue light'], a: 0, why: 'Light bends around stars and galaxies. Astronomers use this “gravitational lensing” like a giant magnifying glass.' },
    { q: 'Where does a clock tick the slowest?', opts: ['Close to something very massive', 'Far out in empty space', 'Clocks tick the same everywhere'], a: 0, why: 'Stronger gravity means slower time. It’s a tiny effect on Earth, but GPS has to correct for it.' },
  ],
};
