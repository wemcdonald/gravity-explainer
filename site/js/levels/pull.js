// Mission 3: Newton's big idea. Everything pulls on everything; more mass = more pull, more distance = much less.
import { h, makeSim, slider, text, drawStars, ball, toast, rand, TAU } from '../ui.js';
import { sfx } from '../audio.js';

export const pullForce = (m1, m2, d) => (m1 * m2) / (d * d);

function forceStage(el, c) {
  const sim = makeSim(el, 800, 360);
  const { ctx, W, H } = sim;
  const s = { m1: 4, m2: 4, d: 4 };
  let shown = { ...s };
  const big = h('span', { class: 'big-num' });
  const task = h('div', { class: 'panel', style: { marginTop: '10px' } });
  const sl = {
    m1: slider({ min: 1, max: 10, value: s.m1, oninput: (v) => { s.m1 = v; changed(); } }),
    m2: slider({ min: 1, max: 10, value: s.m2, oninput: (v) => { s.m2 = v; changed(); } }),
    d: slider({ min: 1, max: 10, value: s.d, oninput: (v) => { s.d = v; changed(); } }),
  };
  const row = (label, input) => h('div', { class: 'controls' }, h('label', { style: { width: '150px' } }, label), input);
  el.append(
    h('div', { class: 'controls' }, h('span', { class: 'group-label' }, 'Pull strength'), big),
    row('🔵 Blue planet mass', sl.m1), row('🟠 Orange planet mass', sl.m2), row('↔️ Distance apart', sl.d), task);

  const set = (vals, locked) => {
    Object.assign(s, vals);
    for (const k of Object.keys(sl)) { sl[k].value = s[k]; sl[k].disabled = locked.includes(k); sl[k].style.opacity = locked.includes(k) ? 0.35 : 1; }
    changed();
  };

  const challenges = [
    {
      text: 'Challenge 1 of 3: The masses are locked. Using <b>only distance</b>, make the pull exactly <b>4</b>.',
      init: () => set({ m1: 4, m2: 4, d: 4 }, ['m1', 'm2']), ok: () => pullForce(s.m1, s.m2, s.d) === 4,
      win: 'You cut the distance in <strong>half</strong> and the pull got <strong>4× stronger</strong>, not 2×. Distance is a big deal!',
    },
    {
      text: 'Challenge 2 of 3: Now distance is locked. Change <b>only the orange planet</b> to make the pull exactly <b>4</b>.',
      init: () => set({ m1: 2, m2: 4, d: 2 }, ['m1', 'd']), ok: () => pullForce(s.m1, s.m2, s.d) === 4,
      win: '<strong>Double the mass, double the pull.</strong> Mass is simple. And notice both arrows are always the same size: you pull on Earth exactly as hard as Earth pulls on you!',
    },
  ];
  let stage = 0;
  let busy = true; // true while a challenge is being set up, so setup can't count as a win

  function changed() {
    sfx('tick');
    big.textContent = pullForce(s.m1, s.m2, s.d).toFixed(2);
    const ch = challenges[stage];
    if (!busy && ch && ch.ok()) {
      sfx('win'); c.whoa(ch.win);
      busy = true;
      stage++;
      setTimeout(startChallenge, 900);
    }
  }

  function startChallenge() {
    const ch = challenges[stage];
    if (ch) { task.innerHTML = ch.text; ch.init(); busy = false; return; }
    if (stage === 2) {
      set({ m1: 3, m2: 3, d: 1 }, ['m1', 'm2', 'd']);
      task.replaceChildren(
        h('div', { html: 'Challenge 3 of 3: <b>Predict!</b> The pull is 9 right now. If the planets move <b>3× farther apart</b>, the pull becomes…' }),
        h('div', { class: 'controls' }, [['3', false], ['1', true], ['4.5', false]].map(([label, right]) =>
          h('button', {
            class: 'btn small',
            onclick: () => {
              set({ m1: 3, m2: 3, d: 3 }, ['m1', 'm2', 'd']);
              if (right) {
                sfx('win'); stage = 3; c.award('force');
                c.whoa('<strong>3× farther = 9× weaker</strong> (because 3 × 3 = 9). Scientists call this the <strong>inverse-square law</strong>. It’s why the Sun’s pull on far-away Neptune is so gentle.');
                startChallenge();
              } else {
                sfx('boing'); toast('Look at the number now… try again!');
                setTimeout(startChallenge, 1600);
              }
            },
          }, label))));
      return;
    }
    set({ ...s }, []);
    task.innerHTML = '🎉 All three done! The sliders are unlocked. Can you find the strongest pull possible? The weakest?';
  }

  sim.loop((dt) => {
    for (const k of ['m1', 'm2', 'd']) shown[k] += (s[k] - shown[k]) * Math.min(1, dt * 10);
    ctx.fillStyle = '#060a1c'; ctx.fillRect(0, 0, W, H);
    drawStars(ctx, W, H, 21);
    const gap = 60 + shown.d * 56;
    const x1 = W / 2 - gap / 2, x2 = W / 2 + gap / 2, y = H / 2;
    const r1 = 14 + Math.cbrt(shown.m1) * 13, r2 = 14 + Math.cbrt(shown.m2) * 13;
    const f = pullForce(shown.m1, shown.m2, shown.d);
    const len = Math.min(gap / 2 - 6, 10 + Math.sqrt(f) * 22);
    ball(ctx, x1, y, r1, '#9fd4ff', '#1d5fae');
    ball(ctx, x2, y, r2, '#ffd29a', '#c4581a');
    ctx.strokeStyle = '#ff5fa2'; ctx.fillStyle = '#ff5fa2'; ctx.lineWidth = 3 + Math.min(9, f);
    for (const [x, dir] of [[x1, 1], [x2, -1]]) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dir * len, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + dir * (len + 12), y); ctx.lineTo(x + dir * len, y - 9); ctx.lineTo(x + dir * len, y + 9); ctx.fill();
    }
    text(ctx, `mass ${Math.round(shown.m1)}`, x1, y + r1 + 18, { size: 15, color: '#9fd4ff' });
    text(ctx, `mass ${Math.round(shown.m2)}`, x2, y + r2 + 18, { size: 15, color: '#ffd29a' });
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(x1, 50); ctx.lineTo(x2, 50); ctx.stroke(); ctx.setLineDash([]);
    text(ctx, `distance ${Math.round(shown.d)}`, W / 2, 34, { size: 15, color: '#cfd6ff' });
  });
  startChallenge();
}

function clumpStage(el, c) {
  const sim = makeSim(el, 800, 500);
  const { ctx, W, H } = sim;
  const G = 900, SOFT = 6;
  let dust = [];
  let won = false;
  let told = false;

  const add = (x, y, n, spread, spin = 0.4) => {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), r = Math.sqrt(Math.random()) * spread;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      // a gentle swirl around the middle, like a real dust cloud
      dust.push({ x: px, y: py, vx: -(py - H / 2) * spin * 0.1 + rand(-4, 4), vy: (px - W / 2) * spin * 0.1 + rand(-4, 4), m: 1, hue: rand(20, 55) });
    }
  };
  const restart = () => { dust = []; won = false; add(W / 2, H / 2, 130, 210); };
  const radius = (m) => 2.2 * Math.cbrt(m) + 1;

  el.append(h('div', { class: 'controls' },
    h('button', { class: 'btn small secondary', onclick: () => { sfx('pop'); restart(); } }, '🔁 New dust cloud'),
    h('span', { class: 'readout' }, 'Tap the cloud to sprinkle more dust.')));
  sim.pointer({ down: (p) => { sfx('pop'); add(p.x, p.y, 12, 26, 0.3); } });

  function step(dt) {
    const n = dust.length;
    for (let i = 0; i < n; i++) {
      const a = dust[i];
      for (let j = i + 1; j < n; j++) {
        const b = dust[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d2 = dx * dx + dy * dy + SOFT * SOFT;
        const inv = G / (d2 * Math.sqrt(d2));
        a.vx += dx * inv * b.m * dt; a.vy += dy * inv * b.m * dt;
        b.vx -= dx * inv * a.m * dt; b.vy -= dy * inv * a.m * dt;
      }
    }
    // A little drag, standing in for the gas in a real dust cloud. Without it,
    // big clumps can end up orbiting each other forever instead of merging.
    const slow = 1 - 0.3 * dt;
    for (const p of dust) {
      p.vx *= slow; p.vy *= slow;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 5 || p.x > W - 5) p.vx *= -0.5;
      if (p.y < 5 || p.y > H - 5) p.vy *= -0.5;
      p.x = Math.max(5, Math.min(W - 5, p.x)); p.y = Math.max(5, Math.min(H - 5, p.y));
    }
    // sticky collisions: clumps merge and keep their combined motion
    for (let i = 0; i < dust.length; i++) {
      for (let j = dust.length - 1; j > i; j--) {
        const a = dust[i], b = dust[j];
        const rr = radius(a.m) + radius(b.m);
        if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 < rr * rr * 0.6) {
          const m = a.m + b.m;
          a.x = (a.x * a.m + b.x * b.m) / m; a.y = (a.y * a.m + b.y * b.m) / m;
          a.vx = (a.vx * a.m + b.vx * b.m) / m; a.vy = (a.vy * a.m + b.vy * b.m) / m;
          a.m = m;
          dust.splice(j, 1);
        }
      }
    }
  }

  sim.loop((dt) => {
    step(dt / 2); step(dt / 2);
    ctx.fillStyle = 'rgba(6,10,28,.35)'; ctx.fillRect(0, 0, W, H); // leaves soft trails
    let total = 0, biggest = dust[0];
    for (const p of dust) { total += p.m; if (p.m > biggest.m) biggest = p; }
    for (const p of dust) {
      const r = radius(p.m);
      if (p.m > 12) ball(ctx, p.x, p.y, r, '#ffe0a8', `hsl(${p.hue},60%,32%)`);
      else { ctx.fillStyle = `hsl(${p.hue},80%,70%)`; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill(); }
    }
    const share = biggest ? biggest.m / total : 0;
    ctx.fillStyle = '#060a1c'; ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = '#1f2858'; ctx.fillRect(250, 14, 300, 14);
    ctx.fillStyle = '#ffd166'; ctx.fillRect(250, 14, 300 * Math.min(1, share / 0.6), 14);
    text(ctx, 'Biggest clump', 240, 21, { size: 14, align: 'right', color: '#cfd6ff' });
    text(ctx, `${Math.round(share * 100)}% of all the dust (goal: 60%)`, 560, 21, { size: 14, align: 'left', color: '#cfd6ff' });
    if (!told && biggest && biggest.m > 15) {
      told = true;
      c.whoa('<strong>Snowball effect!</strong> A bigger clump has more gravity, so it grabs more dust, so it gets even bigger. That’s called <strong>accretion</strong>.');
    }
    if (!won && share >= 0.6) {
      won = true; c.award('planet');
      c.whoa('<strong>You built a planet!</strong> Earth formed just like this 4.5 billion years ago. And planets are round because gravity pulls all that stuff toward the middle from every side.');
    }
  });
  restart();
}

export default {
  id: 'pull', title: 'Newton’s Pull', icon: '🍎', color: '#ff8fd0',
  tagline: 'Everything pulls on everything. Even you.',
  stars: [
    { id: 'force', label: 'Beat the 3 pull challenges' },
    { id: 'planet', label: 'Build a planet: get 60% of the dust into one clump' },
    { id: 'quiz', label: 'Finish the quiz' },
  ],
  stages: [
    {
      say: 'About 350 years ago, Isaac Newton figured out that <b>every</b> object pulls on every other object: apples, moons, you, me. Two things set how strong the pull is: <b>mass</b> and <b>distance</b>.',
      goals: ['force'], build: forceStage,
    },
    {
      say: 'Every speck of dust pulls on every other speck. Watch what gravity does to a cloud of space dust all by itself.',
      goals: ['planet'], build: clumpStage,
    },
  ],
  quiz: [
    { q: 'Two planets move TWICE as far apart. The pull between them becomes…', opts: ['4 times weaker', '2 times weaker', '2 times stronger'], a: 0, why: 'Twice the distance means 2 × 2 = 4 times weaker. That’s the inverse-square law.' },
    { q: 'Earth pulls on you. Do you pull on Earth?', opts: ['Yes, exactly as hard', 'Yes, but much weaker', 'No, only big things pull'], a: 0, why: 'The pull is always equal both ways. Earth just doesn’t budge much because it’s so massive.' },
    { q: 'Why are planets round?', opts: ['Gravity pulls everything toward the center', 'They spin really fast', 'They were rolled like snowballs'], a: 0, why: 'Gravity pulls inward from every direction, and the shape that gets everything closest to the center is a ball.' },
  ],
};
