// Mission 2: gravity is different on every world, so your weight and your jump change too.
import { h, makeSim, chips, text, drawStars, toast } from '../ui.js';
import { sfx } from '../audio.js';
import { state, save } from '../store.js';

export const WORLDS = {
  pluto: { label: 'Pluto', emoji: '🧊', g: 0.62, sky: '#05060f', ground: '#b9a58f', stars: true },
  moon: { label: 'Moon', emoji: '🌙', g: 1.62, sky: '#05060f', ground: '#8d8f99', stars: true },
  mars: { label: 'Mars', emoji: '🔴', g: 3.71, sky: '#d9a273', ground: '#a8452a' },
  earth: { label: 'Earth', emoji: '🌍', g: 9.81, sky: '#58a6ee', ground: '#4caf50' },
  jupiter: { label: 'Jupiter', emoji: '🟠', g: 24.79, sky: '#c98b52', ground: '#e6c9a0' },
  sun: { label: 'Sun', emoji: '☀️', g: 274, sky: '#ff9d1c', ground: '#ffe45c' },
};
const V0 = Math.sqrt(2 * 9.81 * 0.5); // legs that jump 0.5 m on Earth
export const jumpHeight = (g) => (V0 * V0) / (2 * g);

function jumpStage(el, c) {
  const sim = makeSim(el, 800, 500);
  const { ctx, W, H } = sim;
  const GROUND = 440, PX = 42;
  const targets = [{ h: 1.3, got: false }, { h: 3.0, got: false }, { h: 7.9, got: false }];
  const visited = new Set();
  const seen = new Set();
  let y = 0, v = 0, air = false, peak = 0;

  const world = chips('World', Object.entries(WORLDS).map(([value, w]) => ({ value, label: `${w.emoji} ${w.label}` })), 'earth', () => { y = 0; v = 0; air = false; });
  const info = h('span', { class: 'readout' });
  const jump = () => {
    if (air) return;
    air = true; v = V0; peak = 0;
    sfx('boing');
  };
  el.append(h('div', { class: 'controls' }, world.el),
    h('div', { class: 'controls' }, h('button', { class: 'btn go', onclick: jump }, '🦘 JUMP!'), info));
  sim.pointer({ down: jump });

  function land() {
    const key = world.get();
    const w = WORLDS[key];
    air = false; y = 0;
    sfx(w.g > 20 ? 'thud' : 'soft');
    visited.add(key);
    const hit = targets.find((t) => !t.got && Math.abs(t.h - peak) < 0.45);
    if (hit) {
      hit.got = true; sfx('coin');
      toast(`⭐ Grabbed it! ${targets.filter((t) => t.got).length}/3`);
      if (targets.every((t) => t.got)) c.award('grab');
    }
    const say = (k, html) => { if (!seen.has(k)) { seen.add(k); c.whoa(html); } };
    if (key === 'jupiter') say('j', '<strong>Jupiter is a heavyweight:</strong> 318 Earths’ worth of stuff. More stuff means more gravity, so you can barely hop. (It also has no solid ground. We’re pretending.)');
    if (key === 'pluto') say('p', '<strong>Tiny world, tiny gravity.</strong> On Pluto you could jump over a giraffe and float for 10 whole seconds.');
    if (key === 'sun') say('s', '<strong>The Sun has 333,000 times more stuff than Earth.</strong> Your jump there is thinner than a pencil… and you’d weigh as much as a truck. (We’re also pretending you’re fireproof.)');
    if (key === 'moon') say('m', '<strong>Same legs, 6× the jump.</strong> Your muscles didn’t change. The Moon just pulls on you less, because it has way less stuff in it than Earth.');
  }

  sim.loop((dt) => {
    const w = WORLDS[world.get()];
    if (air) {
      v -= w.g * dt; y += v * dt; peak = Math.max(peak, y);
      if (y <= 0) land();
    }
    ctx.fillStyle = w.sky; ctx.fillRect(0, 0, W, H);
    if (w.stars) drawStars(ctx, W, GROUND, 5);
    ctx.fillStyle = w.ground; ctx.fillRect(0, GROUND, W, H - GROUND);
    const dark = w.stars;
    // ruler
    for (let m = 0; m <= 8; m++) {
      const yy = GROUND - m * PX;
      ctx.fillStyle = dark ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.3)';
      ctx.fillRect(40, yy, m % 2 ? 10 : 18, 2);
      if (m && m % 2 === 0) text(ctx, `${m} m`, 64, yy, { size: 13, align: 'left', color: dark ? '#cfd6ff' : '#1b2a4a' });
    }
    // floating stars to grab at the very top of a jump
    for (const t of targets) {
      const yy = GROUND - t.h * PX - 62;
      ctx.globalAlpha = t.got ? 0.25 : 1;
      text(ctx, '⭐', 560, yy, { size: 34 });
      text(ctx, t.got ? 'got it!' : `${t.h} m`, 600, yy, { size: 15, align: 'left', color: dark ? '#fff' : '#10203f' });
      ctx.globalAlpha = 1;
    }
    // jumper: squash a little on big worlds
    const squash = w.g > 100 ? 0.45 : 1;
    ctx.save();
    ctx.translate(480, GROUND - y * PX);
    ctx.scale(1, squash);
    text(ctx, '🧑‍🚀', 0, -34, { size: 64 });
    ctx.restore();
    if (air || peak) text(ctx, `Jump height: ${peak < 0.1 ? (peak * 100).toFixed(1) + ' cm' : peak.toFixed(1) + ' m'}`, 400, 26, { size: 20, color: dark ? '#ffd166' : '#10203f' });
    info.textContent = `${w.label} gravity: ${w.g} m/s² (${(w.g / 9.81).toFixed(2)}× Earth) · worlds visited ${visited.size}/6`;
  });
}

function weighStage(el, c) {
  const order = ['pluto', 'moon', 'mars', 'earth', 'jupiter'];
  let found = 0;
  const input = h('input', { type: 'number', min: 1, max: 999, value: state.weight || 80, style: { font: 'inherit', fontSize: '24px', width: '110px', borderRadius: '12px', border: '2px solid var(--line)', background: 'var(--panel-2)', color: 'var(--text)', padding: '6px 10px', textAlign: 'center' } });
  const unit = chips('', [{ value: 'lb', label: 'pounds' }, { value: 'kg', label: 'kilograms' }], state.units, (u) => { state.units = u; save(); paint(); });
  const cards = h('div', { class: 'missions', style: { marginTop: '12px' } });
  const hint = h('p', { class: 'readout' });
  const amount = (key) => `${((+input.value || 0) * WORLDS[key].g / 9.81).toFixed(1)} ${unit.get()}`;
  const shuffled = [...order].sort(() => Math.random() - 0.5);
  const revealed = new Set();

  function paint() {
    state.weight = +input.value || 80; save();
    hint.textContent = found >= order.length
      ? 'Sorted! Your body has the same amount of stuff everywhere. Only the pull changes.'
      : `Tap the worlds from where you’d be LIGHTEST to HEAVIEST. Next up: number ${found + 1}.`;
    cards.replaceChildren(...shuffled.map((key) => {
      const w = WORLDS[key];
      const open = revealed.has(key);
      return h('button', {
        class: `mission ${open ? 'done' : ''}`, style: { '--c': '#ffd166', textAlign: 'center' },
        onclick: (e) => {
          if (open) return;
          if (key === order[found]) { revealed.add(key); found++; sfx('coin'); paint(); if (found === order.length) c.award('weigh'); }
          else { sfx('wrong'); e.currentTarget.animate([{ transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'none' }], 250); }
        },
      }, h('span', { class: 'ico' }, w.emoji), h('h3', {}, w.label), h('p', { style: { minHeight: 0, fontSize: '20px', fontWeight: 700 } }, open ? amount(key) : '???'));
    }));
  }
  input.addEventListener('input', paint);
  el.append(h('div', { class: 'panel' },
    h('div', { class: 'controls' }, h('label', {}, 'On Earth I weigh'), input, unit.el),
    hint, cards));
  paint();
}

export default {
  id: 'hop', title: 'Planet Hopper', icon: '🦘', color: '#5be3a0',
  tagline: 'Jump on the Moon, Mars, Jupiter… even the Sun.',
  stars: [
    { id: 'grab', label: 'Grab all 3 floating stars (your jump has to top out right at the star)' },
    { id: 'weigh', label: 'Sort the worlds from lightest to heaviest' },
    { id: 'quiz', label: 'Finish the quiz' },
  ],
  stages: [
    {
      say: 'Gravity isn’t the same everywhere. <b>The more stuff (mass) a world has, the harder it pulls.</b> Pick a world and jump! To grab a star, find the world where your jump tops out right at it.',
      goals: ['grab'], build: jumpStage,
    },
    {
      say: '<b>Weight</b> is how hard gravity pulls on you. <b>Mass</b> is how much stuff you’re made of. Travel to another world and your mass stays the same, but your weight changes!',
      goals: ['weigh'], build: weighStage,
    },
  ],
  quiz: [
    { q: 'Why is gravity stronger on Jupiter than on Earth?', opts: ['Jupiter has much more mass', 'Jupiter spins faster', 'Jupiter is farther from the Sun'], a: 0, why: 'More mass means more gravity. Jupiter has 318 times the mass of Earth.' },
    { q: 'You fly to the Moon. What happens to your MASS?', opts: ['It stays the same', 'It gets 6 times smaller', 'It drops to zero'], a: 0, why: 'You’re made of the same amount of stuff. Only your weight (the pull on you) changes.' },
    { q: 'Where could you jump the highest?', opts: ['Pluto', 'Earth', 'Jupiter'], a: 0, why: 'Pluto is tiny, so its gravity is super weak: about 16 times weaker than Earth’s.' },
  ],
};
