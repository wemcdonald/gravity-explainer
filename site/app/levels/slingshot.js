// Mission 5: a slingshot game. Steer a probe using nothing but the gravity of planets.
import { h, makeSim, text, drawStars, ball, toast, TAU } from '../ui.js';
import { sfx } from '../audio.js';
import { STAGES, TARGET_R, SIM_DT, stepProbe, launchVelocity, MAX_SPEED } from '../slingshot-core.js';

function build(el, c) {
  const sim = makeSim(el, 800, 500);
  const { ctx, W, H } = sim;
  const cleared = new Set();
  let n = 0;
  let aim = null; // {from, to} pointer positions while dragging; only the difference matters
  let probe = null; // {x,y,vx,vy,trail}
  let ghosts = []; // earlier attempts, drawn faintly so you can learn from them
  let tries = 0;
  let boom = null;
  let acc = 0;

  const title = h('span', { class: 'readout' });
  const hint = h('span', { class: 'readout', style: { color: 'var(--muted)' } });
  const prev = h('button', { class: 'btn small secondary', onclick: () => load(n - 1) }, '◀');
  const next = h('button', { class: 'btn small secondary', onclick: () => load(n + 1) }, '▶');
  el.append(h('div', { class: 'controls' }, prev, title, next), h('div', { class: 'controls' }, hint));

  function load(i) {
    n = (i + STAGES.length) % STAGES.length;
    probe = null; aim = null; ghosts = []; tries = 0; boom = null;
    title.textContent = `Stage ${n + 1} of ${STAGES.length}: ${STAGES[n].name} ${cleared.has(n) ? '✅' : ''}`;
    hint.textContent = STAGES[n].hint;
  }

  sim.pointer({
    down: (p) => { if (!probe) aim = { from: p, to: p }; },
    move: (p, e, active) => { if (active && !probe && aim) aim.to = p; },
    up: () => {
      if (probe || !aim) return;
      const v = launchVelocity(aim.to.x - aim.from.x, aim.to.y - aim.from.y);
      aim = null;
      if (!v) return;
      sfx('launch'); tries++;
      probe = { x: STAGES[n].start.x, y: STAGES[n].start.y, vx: v.vx, vy: v.vy, trail: [], t: 0 };
    },
  });

  function finish(result) {
    ghosts.push(probe.trail);
    if (ghosts.length > 5) ghosts.shift();
    if (result === 'hit') {
      sfx('win');
      const first = !cleared.has(n);
      cleared.add(n);
      toast(`🎯 Stage ${n + 1} cleared in ${tries} ${tries === 1 ? 'try' : 'tries'}!`);
      if (first && n === 1) c.whoa('<strong>Gravity is free steering.</strong> Your probe has no engine at all. The planet did the turning.');
      if (first && n === 4) c.whoa('<strong>The closer you pass, the harder the bend</strong> (remember the inverse-square law?). Black holes bend paths more than anything else in the universe.');
      if (cleared.size >= 3) c.award('half');
      if (cleared.size >= STAGES.length) {
        c.award('all');
        c.whoa('<strong>This is real rocket science.</strong> Voyager 2 used the gravity of Jupiter, Saturn, Uranus and Neptune to slingshot from one planet to the next, picking up speed each time. It is now more than 20 billion km away.');
      }
      const done = n;
      probe = null;
      setTimeout(() => { if (n === done && cleared.size < STAGES.length) load(n + 1); else load(n); }, 1300);
      return;
    }
    boom = { x: probe.x, y: probe.y, t: 0.5, lost: result === 'lost' || result === 'timeout' };
    sfx(boom.lost ? 'boing' : 'crash');
    if (tries === 6) toast('Tip: softer shots bend MORE. Slow probes spend longer near the planet.');
    probe = null;
  }

  sim.loop((dt) => {
    const st = STAGES[n];
    if (probe) {
      acc += dt;
      while (acc >= SIM_DT && probe) {
        acc -= SIM_DT; probe.t += SIM_DT;
        const r = stepProbe(st, probe, SIM_DT);
        if (probe.trail.length === 0 || (probe.x - probe.trail.at(-1)[0]) ** 2 + (probe.y - probe.trail.at(-1)[1]) ** 2 > 16) probe.trail.push([probe.x, probe.y]);
        if (r !== 'fly') finish(r);
        else if (probe.t > 16) finish('timeout');
      }
    } else acc = 0;

    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, W, H);
    drawStars(ctx, W, H, 40 + n, 100);
    // asteroid walls
    for (const w of st.walls) {
      ctx.fillStyle = '#5b5568'; ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = '#7d768c';
      for (let k = 0; k < Math.max(w.w, w.h) / 22; k++) {
        const x = w.w > w.h ? w.x + 12 + k * 22 : w.x + w.w / 2, y = w.w > w.h ? w.y + w.h / 2 : w.y + 12 + k * 22;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill();
      }
    }
    // planets with a glow showing how far their gravity reaches
    for (const p of st.planets) {
      const reach = Math.sqrt(p.gm) / 12;
      const g = ctx.createRadialGradient(p.x, p.y, p.r, p.x, p.y, reach);
      g.addColorStop(0, p.hole ? 'rgba(255,140,60,.5)' : 'rgba(140,170,255,.28)'); g.addColorStop(1, 'rgba(140,170,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, reach, 0, TAU); ctx.fill();
      if (p.hole) {
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#ffb054'; ctx.lineWidth = 3; ctx.stroke();
      } else ball(ctx, p.x, p.y, p.r, p.c[0], p.c[1]);
    }
    // target portal
    const pulse = 1 + 0.12 * Math.sin(performance.now() / 250);
    ctx.strokeStyle = '#5be3a0'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(st.target.x, st.target.y, TARGET_R * pulse, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#5be3a0'; ctx.fill(); ctx.globalAlpha = 1;
    text(ctx, '🎯', st.target.x, st.target.y, { size: 22 });
    // earlier attempts
    ghosts.forEach((trail, k) => {
      ctx.strokeStyle = `rgba(255,255,255,${0.08 + 0.07 * k})`; ctx.lineWidth = 1.5; ctx.beginPath();
      trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    });
    // launcher + aim preview
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.setLineDash([3, 5]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(st.start.x, st.start.y, 18, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (aim && !probe) {
      const v = launchVelocity(aim.to.x - aim.from.x, aim.to.y - aim.from.y);
      ctx.strokeStyle = '#ff8fd0'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(aim.from.x, aim.from.y); ctx.lineTo(aim.to.x, aim.to.y); ctx.stroke();
      ctx.fillStyle = '#ff8fd0'; ctx.beginPath(); ctx.arc(aim.to.x, aim.to.y, 7, 0, TAU); ctx.fill();
      if (v) {
        const ghost = { x: st.start.x, y: st.start.y, vx: v.vx, vy: v.vy };
        ctx.fillStyle = '#ffd166';
        for (let i = 1; i <= 168; i++) {
          if (stepProbe(st, ghost, SIM_DT) !== 'fly') break;
          if (i % 12 === 0) { ctx.beginPath(); ctx.arc(ghost.x, ghost.y, 2.5, 0, TAU); ctx.fill(); }
        }
        text(ctx, `power ${Math.round((100 * v.speed) / MAX_SPEED)}%`, st.start.x, st.start.y - 34, { size: 14, color: '#ffd166' });
      }
    }
    if (probe) {
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.beginPath();
      probe.trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      ctx.save(); ctx.translate(probe.x, probe.y); ctx.rotate(Math.atan2(probe.vy, probe.vx) + Math.PI / 4);
      text(ctx, '🚀', 0, 0, { size: 24 }); ctx.restore();
    } else {
      text(ctx, '🛰️', st.start.x, st.start.y, { size: 26 });
      if (!aim && tries === 0) text(ctx, '👆 drag backwards anywhere, then let go', st.start.x + 26, st.start.y + (st.start.y > 400 ? -40 : 40), { size: 15, color: '#ffd166', align: 'left' });
    }
    if (boom) {
      boom.t -= dt;
      text(ctx, boom.lost ? '💨' : '💥', boom.x < 0 || boom.x > W || boom.y < 0 || boom.y > H ? Math.max(20, Math.min(W - 20, boom.x)) : boom.x, Math.max(20, Math.min(H - 20, boom.y)), { size: 34 });
      if (boom.t <= 0) boom = null;
    }
  });
  load(0);
}

export default {
  id: 'slingshot', title: 'Slingshot', icon: '🛰️', color: '#ff9f43',
  tagline: 'Steer a space probe using only gravity.',
  stars: [
    { id: 'half', label: 'Clear 3 stages' },
    { id: 'all', label: 'Clear all 6 stages' },
    { id: 'quiz', label: 'Finish the quiz' },
  ],
  stages: [{
    say: 'Your probe has <b>no engine</b>. One push, then gravity does all the steering. Real space missions swing past planets to bend their path. It’s called a <b>gravity assist</b>.',
    goals: ['half', 'all'], build,
  }],
  quiz: [
    { q: 'What is a gravity assist?', opts: ['Swinging past a planet to bend your path and change speed', 'A rocket booster that fights gravity', 'A seatbelt for astronauts'], a: 0, why: 'A spacecraft borrows a planet’s gravity to change direction and speed without burning fuel.' },
    { q: 'A probe passes CLOSER to a planet. Its path bends…', opts: ['More', 'Less', 'Exactly the same'], a: 0, why: 'Closer means a much stronger pull, so the path curves more sharply.' },
    { q: 'Which probes used gravity assists to tour the outer planets?', opts: ['Voyager 1 and 2', 'The Hubble telescope', 'The Apollo Moon landers'], a: 0, why: 'The Voyagers launched in 1977 and slingshotted past the giant planets. They’re still flying, far beyond Pluto.' },
  ],
};
