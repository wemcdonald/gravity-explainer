// Mission 7: black holes. Squeeze anything small enough and not even light can escape.
import { h, makeSim, chips, text, drawStars, toast, TAU, clamp } from '../ui.js';
import { sfx, blip } from '../audio.js';

const C = 299792458;
export const THINGS = {
  earth: { label: '🌍 Earth', emoji: '🌍', r: 6.371e6, rs: 8.87e-3, as: 'a marble', fact: 'All of Earth, every mountain and ocean, squeezed into something the size of <strong>a marble</strong>.' },
  sun: { label: '☀️ Sun', emoji: '☀️', r: 6.957e8, rs: 2953, as: 'a small town', fact: 'The Sun would have to shrink to about 6 km across, the size of <strong>a small town</strong>. (Don’t worry: the Sun is too small to ever do this by itself.)' },
  moon: { label: '🌙 Moon', emoji: '🌙', r: 1.737e6, rs: 1.09e-4, as: 'a grain of sand', fact: 'The whole Moon, crushed smaller than <strong>a grain of sand</strong>.' },
  you: { label: '🧑‍🚀 You', emoji: '🧑‍🚀', r: 0.5, rs: 5.2e-26, as: 'way smaller than an atom', fact: 'You’d have to be squished <strong>billions of times smaller than the center of an atom</strong>. Nothing in the universe can squeeze that hard. Phew!' },
};

/** Escape speed (m/s) from the surface of a thing squeezed to radius r. */
export const escapeSpeed = (thing, r) => C * Math.sqrt(thing.rs / r);

export function fmtLen(m) {
  if (m >= 1e6) return `${Math.round(m / 1000).toLocaleString()} km`;
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  if (m >= 1) return `${m.toFixed(1)} m`;
  if (m >= 0.01) return `${(m * 100).toFixed(1)} cm`;
  if (m >= 1e-4) return `${(m * 1000).toFixed(2)} mm`;
  if (m >= 1e-10) return 'thinner than a hair';
  if (m >= 1e-15) return 'smaller than an atom';
  return 'smaller than the center of an atom';
}
function fmtSpeed(v) {
  if (v >= C * 0.999) return 'LIGHT SPEED';
  if (v >= 1000) return `${(v / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} km/s`;
  if (v >= 1) return `${v.toFixed(1)} m/s`;
  return 'almost zero';
}

function squishStage(el, c) {
  const sim = makeSim(el, 800, 400);
  const { ctx, W, H } = sim;
  let key = 'earth';
  let f = 1; // 1 = normal size, 0 = black hole
  let holding = false;
  let hole = false;
  let beat = 0;
  const made = new Set();
  const pick = chips('Squish this', Object.entries(THINGS).map(([value, t]) => ({ value, label: t.label })), key, (v) => { key = v; f = 1; hole = false; });
  const btn = h('button', { class: 'btn danger', style: { userSelect: 'none', touchAction: 'none' } }, '🗜️ HOLD TO SQUISH');
  const press = (e) => { e.preventDefault(); if (hole) { f = 1; hole = false; } holding = true; };
  const release = () => { holding = false; };
  btn.addEventListener('pointerdown', press);
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, release);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  el.append(h('div', { class: 'controls' }, pick.el), h('div', { class: 'controls' }, btn, h('span', { class: 'readout', style: { color: 'var(--muted)' } }, 'Let go too early and it springs back!')));

  sim.loop((dt, t) => {
    const th = THINGS[key];
    if (!hole) {
      if (holding) {
        f -= dt * 0.28;
        beat -= dt;
        if (beat <= 0) { beat = 0.09; blip(180 + (1 - f) * 900, 0.07, 0.08); }
        if (f <= 0) {
          f = 0; hole = true; holding = false; sfx('slurp');
          made.add(key);
          toast(`⚫ ${th.label} is now a black hole, the size of ${th.as}!`);
          c.whoa(th.fact);
          if (made.size === 1) c.whoa('<strong>A black hole isn’t a hole.</strong> It’s a huge amount of stuff squeezed so small that its escape speed is faster than light. Since nothing can go faster than light, <strong>nothing gets out</strong>. The point of no return is called the <strong>event horizon</strong>.');
          if (made.size >= 2) c.award('squish');
        }
      } else f = Math.min(1, f + dt * 0.9);
    }
    const r = Math.exp(Math.log(th.rs) + f * (Math.log(th.r) - Math.log(th.rs)));
    const v = escapeSpeed(th, r);
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, W, H);
    drawStars(ctx, W, H, 91, 80);
    const cx = 250, cy = 200, px = 26 + 120 * f;
    if (hole) {
      const g = ctx.createRadialGradient(cx, cy, 24, cx, cy, 90);
      g.addColorStop(0, 'rgba(255,170,60,.9)'); g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 90, 0, TAU); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, 30, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffd9a0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, 62, 12, -0.25, 0, TAU); ctx.stroke();
    } else {
      const shake = holding ? (1 - f) * 5 : 0;
      ctx.save();
      ctx.translate(cx + Math.sin(t * 70) * shake, cy + Math.cos(t * 83) * shake);
      text(ctx, th.emoji, 0, px * 0.08, { size: px * 1.9 });
      ctx.restore();
      // squeeze arrows
      if (holding) for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU, d = px + 34 - ((t * 60) % 22);
        text(ctx, '▸', cx + Math.cos(a) * d, cy + Math.sin(a) * d, { size: 20, color: '#ff7a8a' });
      }
    }
    // readouts
    text(ctx, 'SIZE ACROSS', 470, 70, { size: 14, color: '#a9b1dc', align: 'left' });
    text(ctx, fmtLen(r * 2), 470, 102, { size: 30, color: '#ffd166', align: 'left', weight: 700 });
    text(ctx, 'SPEED NEEDED TO ESCAPE', 470, 160, { size: 14, color: '#a9b1dc', align: 'left' });
    text(ctx, fmtSpeed(v), 470, 192, { size: 30, color: hole ? '#ff7a8a' : '#ffd166', align: 'left', weight: 700 });
    // speed bar on a log scale up to light speed
    const frac = clamp(Math.log10(Math.max(v, 100) / 100) / Math.log10(C / 100), 0, 1);
    ctx.fillStyle = '#1f2858'; ctx.fillRect(470, 230, 290, 20);
    const bar = ctx.createLinearGradient(470, 0, 760, 0);
    bar.addColorStop(0, '#5be3a0'); bar.addColorStop(0.7, '#ffd166'); bar.addColorStop(1, '#ff4d6d');
    ctx.fillStyle = bar; ctx.fillRect(470, 230, 290 * frac, 20);
    ctx.fillStyle = '#fff'; ctx.fillRect(758, 222, 3, 36);
    text(ctx, 'light speed ⚡', 760, 274, { size: 14, color: '#fff', align: 'right' });
    text(ctx, 'rocket', 470, 274, { size: 14, color: '#a9b1dc', align: 'left' });
    if (hole) text(ctx, 'NOT EVEN LIGHT CAN ESCAPE', 615, 330, { size: 20, color: '#ff7a8a', weight: 700 });
  });
}

// ---------- stage 2: Horizon Run ----------
// The ship always circles the hole; the player only chooses how close to fly.
export const RS = 26; // event horizon radius, px
export const ISCO = 3 * RS; // closest stable orbit around a real (non-spinning) black hole: 3× the horizon
export const ENGINE = 90; // fastest the ship can climb or dive, px/s
const GM = 3.92e6;
/** How fast space drags the ship inward once it is inside the last stable orbit. */
export const inwardDrift = (r) => (r >= ISCO ? 0 : 110 * Math.pow((ISCO - r) / (ISCO - RS), 1.5));
/** Radial speed of the ship when the player is aiming for radius `want`. */
export const radialSpeed = (r, want) => clamp((want - r) * 8, -ENGINE, ENGINE) - inwardDrift(r);
export const ORB_RADII = [170, 125, 95, 66, 50];

function runStage(el, c) {
  const sim = makeSim(el, 800, 500);
  const { ctx, W, H } = sim;
  const CX = 400, CY = 250, START = 200;
  let r, th, orb, got = 0, lost = 0, dead = 0, want = null, myClock = 0, farClock = 0, won = false;
  const seen = new Set();
  const say = (k, html) => { if (!seen.has(k)) { seen.add(k); c.whoa(html); } };
  const keys = new Set();

  const spawn = () => { r = START; th = -Math.PI / 2; };
  const placeOrb = () => { const a = Math.random() * TAU; orb = { r: ORB_RADII[got], a }; };
  const restart = () => { got = 0; lost = 0; myClock = 0; farClock = 0; won = false; dead = 0; spawn(); placeOrb(); };

  el.append(h('div', { class: 'controls' },
    h('span', { class: 'readout', style: { color: 'var(--muted)' } }, 'Press and hold: your ship flies to that distance from the black hole. (Or use the ↑ ↓ keys.)'),
    h('button', { class: 'btn small secondary', onclick: () => { sfx('pop'); restart(); } }, '🔁 Restart')));
  const aim = (p) => { want = clamp(Math.hypot(p.x - CX, p.y - CY), 12, 235); };
  sim.pointer({ down: aim, move: (p, e, active) => { if (active) aim(p); }, up: () => { want = null; } });
  const kd = (e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { keys.add(e.key); e.preventDefault(); } };
  const ku = (e) => keys.delete(e.key);
  addEventListener('keydown', kd); addEventListener('keyup', ku);

  function step(dt) {
    let target = want;
    if (target == null && keys.size) target = clamp(r + (keys.has('ArrowUp') ? 60 : -60), 12, 235);
    const n = 6, d = dt / n;
    for (let i = 0; i < n; i++) {
      r = Math.min(235, r + radialSpeed(r, target ?? r) * d);
      th += Math.sqrt(GM / (r * r * r)) * d; // closer orbits whip around faster
    }
    farClock += dt;
    myClock += dt * Math.sqrt(Math.max(0.02, 1 - (1.5 * RS) / r));
    if (r < RS + 3) {
      dead = 1.6; lost++; sfx('slurp');
      say('spag', '<strong>Spaghettified!</strong> Near a black hole, gravity pulls on your feet much harder than on your head, stretching you out like a noodle. Scientists really do call this <strong>spaghettification</strong>.');
      return;
    }
    if (r < 120) say('fast', '<strong>Feel that speed?</strong> The closer you orbit, the faster you have to go. It’s the same reason Mercury zips around the Sun in 88 days while far-away Neptune takes 165 years.');
    if (r < ISCO - 2) say('isco', '<strong>You’re in the danger zone.</strong> Around a black hole there is a closest safe orbit. Inside it, nothing can circle steadily: everything gets dragged inward unless it fights its way back out. Newton’s gravity can’t do that. Only Einstein’s bent space can.');
    const x = Math.cos(th) * r, y = Math.sin(th) * r;
    if (Math.hypot(x - Math.cos(orb.a) * orb.r, y - Math.sin(orb.a) * orb.r) < 20) {
      got++; sfx('coin');
      if (got >= ORB_RADII.length) {
        won = true; sfx('win'); c.award('run');
        c.whoa(`<strong>Check the clocks!</strong> Your ship’s clock counted ${myClock.toFixed(1)} s, but a clock far away counted ${farClock.toFixed(1)} s. <strong>Time really does run slower near a black hole.</strong> Stay close long enough and you’d come home younger than your friends.`);
      } else { placeOrb(); toast(`🔮 Data orb ${got}/5. The next one is closer in…`); }
    }
  }

  sim.loop((dt, t) => {
    if (!sim.canvas.isConnected) { removeEventListener('keydown', kd); removeEventListener('keyup', ku); }
    if (dead > 0) { dead -= dt; if (dead <= 0) spawn(); }
    else if (!won) step(dt);

    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, W, H);
    drawStars(ctx, W, H, 13, 110);
    // danger zone: inside the last stable orbit
    const zone = ctx.createRadialGradient(CX, CY, RS, CX, CY, ISCO);
    zone.addColorStop(0, 'rgba(255,70,90,.45)'); zone.addColorStop(1, 'rgba(255,70,90,.06)');
    ctx.fillStyle = zone; ctx.beginPath(); ctx.arc(CX, CY, ISCO, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,122,138,.8)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(CX, CY, ISCO, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    text(ctx, 'DANGER ZONE', CX, CY - ISCO - 12, { size: 13, color: '#ff7a8a' });
    // swirling hot gas, then the hole itself
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = `rgba(255,${150 + k * 30},60,${0.4 - k * 0.1})`; ctx.lineWidth = 7 - k * 2;
      const a0 = t * (2.4 - k * 0.6);
      ctx.beginPath(); ctx.arc(CX, CY, RS + 8 + k * 9, a0, a0 + 4.4); ctx.stroke();
    }
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(CX, CY, RS, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffd9a0'; ctx.lineWidth = 2; ctx.stroke();
    // the ship's current orbit, and where the player is steering it
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 6]);
    ctx.beginPath(); ctx.arc(CX, CY, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (want != null && !won && dead <= 0) {
      ctx.strokeStyle = 'rgba(255,143,208,.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(CX, CY, want, 0, TAU); ctx.stroke();
    }
    if (!won) {
      const ox = CX + Math.cos(orb.a) * orb.r, oy = CY + Math.sin(orb.a) * orb.r;
      const pulse = 1 + 0.2 * Math.sin(t * 6);
      ctx.fillStyle = 'rgba(110,195,255,.3)'; ctx.beginPath(); ctx.arc(ox, oy, 16 * pulse, 0, TAU); ctx.fill();
      text(ctx, '🔮', ox, oy, { size: 22 });
    }
    const x = CX + Math.cos(th) * r, y = CY + Math.sin(th) * r;
    if (dead > 0) {
      const k = 1 - dead / 1.6; // stretch toward the hole
      ctx.save(); ctx.translate(CX + (x - CX) * (1 - k), CY + (y - CY) * (1 - k)); ctx.rotate(th); ctx.scale(1 + k * 5, 1 - k * 0.8);
      text(ctx, '🚀', 0, 0, { size: 24 }); ctx.restore();
      text(ctx, 'SPAGHETTIFIED! 🍝', CX, 60, { size: 26, color: '#ff7a8a', weight: 700 });
    } else {
      const climbing = !won && radialSpeed(r, want ?? r) > 5;
      ctx.save(); ctx.translate(x, y); ctx.rotate(th + Math.PI / 2);
      if (want != null || keys.size) { ctx.fillStyle = '#ffb054'; ctx.beginPath(); ctx.moveTo(-9, -5); ctx.lineTo(-20 - Math.random() * 8, 0); ctx.lineTo(-9, 5); ctx.fill(); }
      ctx.fillStyle = climbing ? '#fff' : '#e8ecff';
      ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-9, -8); ctx.lineTo(-5, 0); ctx.lineTo(-9, 8); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (!won && r < ISCO && radialSpeed(r, 235) < 25) text(ctx, '⚠️ PULL OUT!', CX, 60, { size: 24, color: '#ffd166', weight: 700 });
    }
    text(ctx, `🔮 ${got}/5`, 16, 24, { size: 20, align: 'left' });
    text(ctx, `ships lost: ${lost}`, 16, 50, { size: 14, align: 'left', color: '#a9b1dc' });
    text(ctx, `your clock ${myClock.toFixed(1)} s`, W - 16, 24, { size: 16, align: 'right', color: '#5be3a0' });
    text(ctx, `far-away clock ${farClock.toFixed(1)} s`, W - 16, 48, { size: 16, align: 'right', color: '#ffd166' });
    if (won) text(ctx, '🎉 All data collected! Mission complete.', CX, 60, { size: 24, color: '#5be3a0', weight: 700 });
  });
  restart();
}

export default {
  id: 'blackhole', title: 'Black Holes', icon: '⚫', color: '#ff7a8a',
  tagline: 'Gravity so strong that light can’t get out.',
  stars: [
    { id: 'squish', label: 'Squish 2 different things into black holes' },
    { id: 'run', label: 'Horizon Run: collect all 5 data orbs' },
    { id: 'quiz', label: 'Finish the quiz' },
  ],
  stages: [
    {
      say: 'Remember escape velocity from the cannon? Squeeze something smaller and its gravity at the surface gets stronger, so you need more speed to escape. What if you squeeze until the escape speed hits <b>the speed of light</b>?',
      goals: ['squish'], build: squishStage,
    },
    {
      say: 'Science mission! Your ship is orbiting a black hole. Steer closer or farther to scoop up 5 data orbs. Each one is nearer the <b>event horizon</b>. Cross that line and there’s no coming back…',
      goals: ['run'], build: runStage,
    },
  ],
  quiz: [
    { q: 'Why is a black hole black?', opts: ['Its gravity is so strong that light can’t escape', 'It’s painted with space dust', 'It’s a hole with nothing in it'], a: 0, why: 'Inside the event horizon the escape speed is faster than light, so no light comes out for us to see.' },
    { q: 'If the Sun magically became a black hole (same mass), Earth would…', opts: ['Keep orbiting just like now, but in the dark', 'Get sucked in right away', 'Fly off into space'], a: 0, why: 'Same mass, same pull at our distance. Black holes aren’t vacuum cleaners. They’re only extreme up close.' },
    { q: 'What is “spaghettification”?', opts: ['Being stretched because gravity pulls harder on your near side', 'A way to cook in zero gravity', 'When a star turns into noodles of light'], a: 0, why: 'Close to a black hole, the pull changes so fast with distance that it stretches things into long thin strands.' },
  ],
};
