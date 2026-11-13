// Mission 1: everything falls at the same rate once air is out of the way.
import { h, makeSim, chips, text, drawStars, toast } from '../ui.js';
import { sfx } from '../audio.js';

// vt = terminal speed in air (m/s). Compact heavy things barely notice air over a 10 m drop.
export const THINGS = {
  ball: { emoji: '🎳', name: 'bowling ball', vt: 90 },
  hammer: { emoji: '🔨', name: 'hammer', vt: 70 },
  elephant: { emoji: '🐘', name: 'elephant', vt: 110 },
  feather: { emoji: '🪶', name: 'feather', vt: 1.3 },
  paper: { emoji: '📄', name: 'sheet of paper', vt: 2.4 },
  balloon: { emoji: '🎈', name: 'balloon', vt: 3.2 },
};
export const PLACES = {
  earth: { label: '🌍 Earth', g: 9.81, air: true },
  chamber: { label: '🧪 No-air chamber', g: 9.81, air: false },
  moon: { label: '🌙 Moon', g: 1.62, air: false },
};
export const DROP_M = 10;

/** Seconds for a thing to fall DROP_M metres. Pure, so it can be unit-tested. */
export function fallTime(thing, place, height = DROP_M) {
  const dt = 0.0005;
  let y = 0, v = 0, t = 0;
  while (y < height) {
    const drag = place.air ? (place.g * v * v) / (thing.vt * thing.vt) : 0;
    v += (place.g - drag) * dt;
    y += v * dt;
    t += dt;
  }
  return t;
}

/** 'left' | 'right' | 'same' */
export function winner(a, b, place) {
  const d = fallTime(a, place) - fallTime(b, place);
  return Math.abs(d) < 0.1 ? 'same' : d < 0 ? 'left' : 'right';
}

function build(el, c) {
  const sim = makeSim(el, 800, 500);
  const { ctx, W, H } = sim;
  const TOP = 92, GROUND = 440, PX = (GROUND - TOP) / DROP_M;
  const X = { left: 300, right: 500 };

  const opts = Object.entries(THINGS).map(([value, t]) => ({ value, label: t.emoji }));
  const left = chips('Left', opts, 'ball', reset);
  const right = chips('Right', opts, 'feather', reset);
  const place = chips('Where', Object.entries(PLACES).map(([value, p]) => ({ value, label: p.label })), 'earth', reset);
  const ask = h('div', { class: 'controls' });
  el.append(h('div', { class: 'controls' }, left.el, right.el), h('div', { class: 'controls' }, place.el), ask);

  const correctSetups = new Set();
  const seen = new Set();
  let run = null; // {bodies:[{key,y,v,t,landed,marks}], guess, place, speed}

  function reset() {
    run = null;
    ask.replaceChildren(
      h('span', { class: 'group-label' }, 'Which lands first?'),
      h('button', { class: 'btn small', onclick: () => drop('left') }, `⬅️ ${THINGS[left.get()].emoji}`),
      h('button', { class: 'btn small', onclick: () => drop('same') }, '🤝 Same time'),
      h('button', { class: 'btn small', onclick: () => drop('right') }, `${THINGS[right.get()].emoji} ➡️`),
    );
  }

  function drop(guess) {
    sfx('whoosh');
    run = {
      guess, place: PLACES[place.get()], placeKey: place.get(), speed: 1, done: false, clock: 0,
      bodies: [left.get(), right.get()].map((key) => ({ key, y: 0, v: 0, t: 0, landed: false, marks: [], nextMark: 0 })),
    };
    ask.replaceChildren(h('span', { class: 'readout' }, 'Falling…'));
  }

  function finish() {
    const [a, b] = run.bodies;
    const d = a.t - b.t;
    const result = Math.abs(d) < 0.1 ? 'same' : d < 0 ? 'left' : 'right';
    const right_ = result === run.guess;
    const setup = `${a.key}|${b.key}|${run.placeKey}`;
    const p = run.place;
    const floaty = (k) => THINGS[k].vt < 10;
    if (right_) {
      sfx('win');
      if (a.key !== b.key) correctSetups.add(setup);
      toast(`✅ You called it! (${Math.min(3, correctSetups.size)}/3 different setups)`);
      if (correctSetups.size >= 3) c.award('predict');
    } else {
      sfx('boing');
      toast('🤔 Surprise! Change something and predict again.');
    }
    const say = (key, html) => { if (!seen.has(key)) { seen.add(key); c.whoa(html); } };
    if (!p.air && (floaty(a.key) !== floaty(b.key))) {
      say('vac', '<strong>No air, no difference!</strong> Gravity pulls harder on heavy things, but heavy things are also harder to get moving. Those two effects cancel out <em>exactly</em>, so everything falls together.');
    }
    if (p.air && floaty(a.key) !== floaty(b.key)) {
      say('air', '<strong>Air is the troublemaker.</strong> The feathery thing isn’t falling slowly because it’s light. It’s slow because air pushes back on it. Try the no-air chamber!');
    }
    if (p.air && !floaty(a.key) && !floaty(b.key) && a.key !== b.key) {
      say('heavy', '<strong>Heavier does NOT mean faster.</strong> An elephant and a bowling ball land together. People believed the opposite for 2,000 years until Galileo tested it.');
    }
    if (run.placeKey === 'moon') {
      say('moon-slow', `<strong>Moon gravity is 6× weaker</strong>, so that took ${a.t.toFixed(1)} seconds instead of 1.4. Things still fall, just lazily.`);
      const pair = new Set([a.key, b.key]);
      if (pair.has('hammer') && pair.has('feather')) {
        c.award('moon');
        say('apollo', '<strong>This really happened!</strong> In 1971, Apollo 15 astronaut David Scott dropped a hammer and a falcon feather on the Moon. They hit the dust at the same moment. You can watch the video!');
      }
    }
    say('accel', 'See the dots? They’re snapshots taken at even time steps. <strong>The gaps keep growing</strong> because gravity doesn’t give things one speed: on Earth it adds about 10 m/s (22 mph) <em>every second</em>.');
    ask.replaceChildren(
      h('span', { class: 'readout' }, `${THINGS[a.key].emoji} ${a.t.toFixed(2)} s   ·   ${THINGS[b.key].emoji} ${b.t.toFixed(2)} s`),
      h('button', { class: 'btn small go', onclick: reset }, '🔁 Drop again'),
    );
  }

  function step(dt) {
    const p = run.place;
    const sub = 8;
    for (let i = 0; i < sub; i++) {
      const d = (dt * run.speed) / sub;
      run.clock += d;
      for (const b of run.bodies) {
        if (b.landed) continue;
        const vt = THINGS[b.key].vt;
        const drag = p.air ? (p.g * b.v * b.v) / (vt * vt) : 0;
        b.v += (p.g - drag) * d;
        b.y += b.v * d;
        b.t += d;
        if (b.t >= b.nextMark) { b.marks.push(b.y); b.nextMark += p.g < 5 ? 0.5 : 0.2; }
        if (b.y >= DROP_M) {
          b.y = DROP_M; b.landed = true;
          sfx(THINGS[b.key].vt < 10 ? 'soft' : 'thud');
          run.speed = 5; // don't make anyone wait for a feather
        }
      }
    }
    if (!run.done && run.bodies.every((b) => b.landed)) { run.done = true; finish(); }
  }

  function scene(pk) {
    if (pk === 'earth') {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#3b8fe0'); g.addColorStop(1, '#bfe6ff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      text(ctx, '☁️', 120, 90, { size: 50 }); text(ctx, '☁️', 660, 150, { size: 38 });
      ctx.fillStyle = '#4caf50'; ctx.fillRect(0, GROUND, W, H - GROUND);
    } else if (pk === 'chamber') {
      ctx.fillStyle = '#20263d'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#59628c'; ctx.lineWidth = 6; ctx.strokeRect(150, 30, 500, GROUND - 30);
      ctx.fillStyle = 'rgba(160,200,255,.07)'; ctx.fillRect(150, 30, 500, GROUND - 30);
      text(ctx, 'ALL THE AIR PUMPED OUT', 400, 52, { size: 15, color: '#8fa0d8' });
      ctx.fillStyle = '#3a4266'; ctx.fillRect(0, GROUND, W, H - GROUND);
    } else {
      ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, W, H);
      drawStars(ctx, W, GROUND, 11);
      text(ctx, '🌍', 660, 90, { size: 54 });
      ctx.fillStyle = '#8d8f99'; ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = '#74767f';
      for (const [x, r] of [[110, 26], [330, 14], [610, 30], [730, 12]]) { ctx.beginPath(); ctx.ellipse(x, GROUND + 30, r, r / 3, 0, 0, 7); ctx.fill(); }
    }
  }

  sim.loop((dt) => {
    if (run && !run.done) step(dt);
    const pk = run ? run.placeKey : place.get();
    scene(pk);
    // platform
    ctx.fillStyle = '#c9ced9'; ctx.fillRect(220, TOP + 8, 360, 8);
    ctx.fillStyle = pk === 'earth' ? '#123' : '#aab'; ctx.globalAlpha = 0.5;
    for (let m = 0; m <= DROP_M; m += 2) text(ctx, `${DROP_M - m} m`, 196, TOP + m * PX, { size: 13, color: pk === 'earth' ? '#123' : '#aab', align: 'right' });
    ctx.globalAlpha = 1;
    const bodies = run ? run.bodies : [{ key: left.get(), y: 0, marks: [] }, { key: right.get(), y: 0, marks: [] }];
    bodies.forEach((b, i) => {
      const x = i ? X.right : X.left;
      ctx.fillStyle = pk === 'earth' ? 'rgba(20,40,80,.55)' : 'rgba(255,255,255,.6)';
      for (const my of b.marks) { ctx.beginPath(); ctx.arc(x - 44, TOP + my * PX - 18, 4, 0, 7); ctx.fill(); }
      text(ctx, THINGS[b.key].emoji, x, TOP + b.y * PX - 18, { size: 44 });
      if (b.landed) text(ctx, `${b.t.toFixed(2)} s`, x, GROUND + 26, { size: 20, color: '#fff' });
    });
    if (run && run.speed > 1 && !run.done) text(ctx, '⏩ fast-forward', 400, 30, { size: 18, color: '#ffd166' });
  });
  reset();
}

export default {
  id: 'drop', title: 'Drop Zone', icon: '🪶', color: '#6ec3ff',
  tagline: 'Does heavy stuff really fall faster?',
  stars: [
    { id: 'predict', label: 'Predict the winner right in 3 different setups' },
    { id: 'moon', label: 'Redo the famous Moon test: 🔨 vs 🪶 on the 🌙' },
    { id: 'quiz', label: 'Finish the quiz' },
  ],
  stages: [{
    say: 'I’m Newt! <b>Gravity</b> is the pull that makes things fall. Pick two things, pick a place, then <b>guess which lands first</b>. Scientists always guess before they test!',
    goals: ['predict', 'moon'],
    build,
  }],
  quiz: [
    { q: 'In a room with NO air, you drop a feather and a bowling ball. What happens?', opts: ['They land at the same time', 'The bowling ball lands first', 'The feather floats up'], a: 0, why: 'Without air in the way, everything falls at the same rate.' },
    { q: 'Why does a feather fall slowly on Earth?', opts: ['Air pushes back on it', 'Gravity ignores light things', 'Feathers are magic'], a: 0, why: 'Gravity pulls on the feather just fine. Air resistance is what slows it down.' },
    { q: 'A ball falls for 1 second, then another second. During the 2nd second it…', opts: ['Falls farther than in the 1st', 'Falls the same distance', 'Slows down'], a: 0, why: 'Gravity keeps adding speed, about 10 m/s every second, so each second it covers more ground.' },
  ],
};
