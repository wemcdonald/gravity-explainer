// Mission 8: gravitational waves, and the questions nobody has answered yet.
import { h, makeSim, chips, text, drawStars, toast, TAU } from '../ui.js';
import { sfx, chirp } from '../audio.js';

/** Sound and timing of a merger: heavier pairs merge faster and at a lower pitch, as in real life. */
export function chirpFor(m1, m2) {
  const total = m1 + m2;
  const top = 200 + 10000 / total;
  return { seconds: 3.2 - total / 60, f0: top / 8, f1: top };
}

function waveStage(el, c) {
  const sim = makeSim(el, 800, 500);
  const { ctx, W, H } = sim;
  const CX = 400, CY = 205;
  const sizes = [{ value: 10, label: 'Small' }, { value: 30, label: 'Medium' }, { value: 60, label: 'HUGE' }];
  const a = chips('Black hole 1', sizes, 30);
  const b = chips('Black hole 2', sizes, 30);
  const done = new Set();
  let run = null; // {t, T, phase, m1, m2, merged}
  let rings = [];
  let trace = [];
  let idlePhase = 0;
  const radius = (m) => 7 + Math.sqrt(m) * 2.4;

  const go = () => {
    const m1 = a.get(), m2 = b.get();
    const ch = chirpFor(m1, m2);
    chirp(ch.seconds, ch.f0, ch.f1);
    run = { t: 0, T: ch.seconds, phase: idlePhase, m1, m2, merged: false, lastRing: 0 };
    trace = [];
  };
  el.append(h('div', { class: 'controls' }, a.el, b.el),
    h('div', { class: 'controls' }, h('button', { class: 'btn danger', onclick: go }, '💫 SMASH THEM TOGETHER'),
      h('span', { class: 'readout', style: { color: 'var(--muted)' } }, 'Turn sound on and listen for the “chirp”!')));

  function merged() {
    const lostMass = Math.round((run.m1 + run.m2) * 0.05);
    run.merged = true;
    sfx('thud');
    rings.push({ r: 10, w: 14, a: 1 });
    done.add([run.m1, run.m2].sort().join('+'));
    toast(`💥 Merged! ${lostMass} Sun${lostMass === 1 ? '' : 's'} worth of mass turned into pure wave energy.`);
    if (done.size === 1) {
      c.whoa('<strong>Space itself rings like a bell.</strong> When two black holes spiral together, they send out ripples in space called <strong>gravitational waves</strong>. They travel at the speed of light, stretching and squeezing everything they pass through (including you, by less than the width of an atom).');
      c.whoa('<strong>We’ve actually heard this!</strong> In 2015, the LIGO detectors caught a chirp from two black holes that merged 1.3 billion years ago. Einstein predicted these waves 100 years earlier, but thought they’d be too faint to ever detect.');
    }
    if (done.size >= 2) c.award('chirp');
  }

  sim.loop((dt) => {
    let sep, strength = 0.12, m1 = a.get(), m2 = b.get();
    if (run && !run.merged) {
      ({ m1, m2 } = run);
      run.t += dt;
      const x = Math.min(run.t / run.T, 0.999);
      sep = 150 * Math.pow(1 - x, 0.25);
      const spin = 2.2 * Math.pow(1 - 0.985 * x, -3 / 8);
      run.phase += spin * dt * 2.2;
      strength = 0.15 + 0.85 * x * x;
      if (run.phase - run.lastRing > Math.PI) { run.lastRing = run.phase; rings.push({ r: sep / 2 + 10, w: 2 + strength * 6, a: 0.25 + strength * 0.7 }); }
      trace.push(Math.sin(run.phase * 2) * strength);
      if (run.t >= run.T) merged();
    } else if (!run) {
      idlePhase += dt * 1.2;
      sep = 150;
      trace.push(Math.sin(idlePhase * 2) * 0.05);
    } else {
      run.t += dt;
      trace.push(Math.sin(run.t * 40) * Math.exp(-(run.t - run.T) * 9) * 0.9);
      if (run.t > run.T + 3.5) { idlePhase = 0; run = null; sep = 150; }
    }
    if (trace.length > 380) trace.shift();

    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, W, H);
    drawStars(ctx, W, 400, 55, 90);
    for (const r of rings) {
      r.r += dt * 210; r.a *= 1 - dt * 0.45;
      ctx.strokeStyle = `rgba(150,130,255,${r.a})`; ctx.lineWidth = r.w;
      ctx.beginPath(); ctx.arc(CX, CY, r.r, 0, TAU); ctx.stroke();
    }
    rings = rings.filter((r) => r.r < 600);

    const hole = (x, y, r) => {
      const g = ctx.createRadialGradient(x, y, r, x, y, r * 2.2);
      g.addColorStop(0, 'rgba(255,170,60,.75)'); g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffd9a0'; ctx.lineWidth = 2; ctx.stroke();
    };
    if (run && run.merged) hole(CX, CY, radius((run.m1 + run.m2) * 0.95));
    else {
      const ph = run ? run.phase : idlePhase, total = m1 + m2;
      // each orbits the shared balance point; the heavy one moves less
      hole(CX + Math.cos(ph) * sep * (m2 / total), CY + Math.sin(ph) * sep * (m2 / total) * 0.75, radius(m1));
      hole(CX - Math.cos(ph) * sep * (m1 / total), CY - Math.sin(ph) * sep * (m1 / total) * 0.75, radius(m2));
    }
    // detector read-out
    ctx.fillStyle = '#0d1330'; ctx.fillRect(0, 400, W, 100);
    ctx.strokeStyle = '#34407d'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 450); ctx.lineTo(W, 450); ctx.stroke();
    ctx.strokeStyle = '#5be3a0'; ctx.lineWidth = 2.5; ctx.beginPath();
    trace.forEach((v, i) => { const x = 20 + i * 2, y = 450 - v * 42; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
    text(ctx, 'WAVE DETECTOR', 16, 414, { size: 13, color: '#a9b1dc', align: 'left' });
    text(ctx, `${m1} Suns + ${m2} Suns`, CX, 24, { size: 18, color: '#cfd6ff' });
  });
}

const MYSTERIES = [
  { icon: '🕳️', q: 'What’s inside a black hole?', a: 'The math says everything gets crushed into a single point… and then the math breaks. Nobody knows what really happens in there.' },
  { icon: '🌌', q: 'What is dark matter?', a: 'Galaxies spin so fast they should fly apart. Something invisible is adding extra gravity to hold them together. We call it dark matter, and nobody has ever caught a piece.' },
  { icon: '🧲', q: 'Why is gravity so weak?', a: 'A tiny fridge magnet can hold up a paperclip against the pull of the ENTIRE Earth. Gravity is by far the weakest force in nature, and nobody knows why.' },
  { icon: '⚛️', q: 'How does gravity work on tiny things?', a: 'Einstein’s gravity and the rules for atoms (quantum physics) refuse to fit together. Finding “quantum gravity” is one of the biggest unsolved puzzles in science. Maybe you’ll crack it.' },
];

function mysteryStage(el, c) {
  const open = new Set();
  const grid = h('div', { class: 'grid2' });
  MYSTERIES.forEach((m, i) => {
    const body = h('p', { style: { margin: '6px 0 0', color: 'var(--muted)' } }, 'Tap to open the case file…');
    const card = h('button', {
      class: 'mission', style: { '--c': '#b48cff', textAlign: 'left' },
      onclick: () => {
        if (open.has(i)) return;
        open.add(i); sfx('ding');
        body.textContent = m.a; body.style.color = 'var(--text)';
        card.classList.add('done');
        if (open.size === MYSTERIES.length) c.award('mystery');
      },
    }, h('span', { class: 'ico' }, m.icon), h('h3', {}, m.q), body);
    grid.append(card);
  });
  el.append(grid);
}

export default {
  id: 'waves', title: 'Ripples & Mysteries', icon: '🌊', color: '#7ae0e0',
  tagline: 'Hear black holes collide. Then meet the unsolved cases.',
  stars: [
    { id: 'chirp', label: 'Smash together 2 different pairs of black holes' },
    { id: 'mystery', label: 'Open all 4 unsolved case files' },
    { id: 'quiz', label: 'Finish the quiz' },
  ],
  stages: [
    {
      say: 'If space can bend, can it <b>ripple</b>? Yes! When really heavy things whirl around each other, they make waves in space itself. Pick two black holes and smash them together.',
      goals: ['chirp'], build: waveStage,
    },
    {
      say: 'You now know more about gravity than anyone on Earth did 400 years ago. But here’s a secret: <b>scientists still haven’t figured it all out</b>. These cases are still open.',
      goals: ['mystery'], build: mysteryStage,
    },
  ],
  quiz: [
    { q: 'What are gravitational waves?', opts: ['Ripples in space itself', 'Big waves in the ocean caused by the Moon', 'Sound waves from rockets'], a: 0, why: 'They’re ripples in space, made when massive things like black holes whirl around and collide.' },
    { q: 'As two black holes spiral closer, the “chirp” gets…', opts: ['Higher and louder', 'Lower and quieter', 'It stays the same'], a: 0, why: 'They orbit faster and faster as they close in, so the pitch sweeps up until they merge.' },
    { q: 'Do scientists understand everything about gravity?', opts: ['No, there are still big mysteries', 'Yes, Newton solved it all', 'Yes, Einstein solved it all'], a: 0, why: 'Dark matter, the inside of black holes, quantum gravity… plenty of puzzles are waiting for future scientists.' },
  ],
};
