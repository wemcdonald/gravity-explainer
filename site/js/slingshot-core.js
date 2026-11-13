// Pure physics and stage data for the Slingshot game (no DOM), so stages can be
// checked for solvability by tests/slingshot-solver.mjs.
export const W = 800;
export const H = 500;
export const MAX_SPEED = 300; // px/s at full pull
export const MIN_SPEED = 40;

export const STAGES = [
  {
    name: 'Warm-up', hint: 'Drag backwards anywhere on the screen, like pulling a slingshot, and let go. The dots show where the probe starts out.',
    start: { x: 90, y: 250 }, target: { x: 700, y: 250 },
    planets: [{ x: 400, y: 440, r: 26, gm: 1.2e6, c: ['#9fd4ff', '#1d5fae'] }], walls: [],
  },
  {
    name: 'Over the wall', hint: 'A straight shot hits the asteroid wall. Let the planet’s gravity bend your path.',
    start: { x: 90, y: 400 }, target: { x: 700, y: 400 },
    planets: [{ x: 400, y: 170, r: 30, gm: 3.6e6, c: ['#ffd29a', '#c4581a'] }],
    walls: [{ x: 388, y: 265, w: 24, h: 235 }],
  },
  {
    name: 'U-turn', hint: 'The target is behind you! Swing around the big planet to turn back.',
    start: { x: 120, y: 110 }, target: { x: 120, y: 390 },
    planets: [{ x: 560, y: 250, r: 36, gm: 4.2e6, c: ['#d6b3ff', '#5a2aa8'] }],
    walls: [{ x: 0, y: 238, w: 400, h: 24 }],
  },
  {
    name: 'Zig-zag', hint: 'Two planets, two bends. Each one tugs the probe as it passes.',
    start: { x: 70, y: 420 }, target: { x: 730, y: 80 },
    planets: [
      { x: 280, y: 170, r: 28, gm: 3.2e6, c: ['#9fe8c0', '#17734a'] },
      { x: 540, y: 330, r: 28, gm: 3.2e6, c: ['#ffb3c8', '#a8234e'] },
    ],
    walls: [{ x: 398, y: 130, w: 24, h: 240 }],
  },
  {
    name: 'Black hole', hint: 'Tiny but super heavy. Get close for a huge bend… but not too close!',
    start: { x: 90, y: 90 }, target: { x: 90, y: 410 },
    planets: [{ x: 430, y: 250, r: 13, gm: 7e6, hole: true, c: ['#000', '#000'] }],
    walls: [{ x: 0, y: 238, w: 300, h: 24 }, { x: 560, y: 0, w: 24, h: 170 }, { x: 560, y: 330, w: 24, h: 170 }],
  },
  {
    name: 'Grand tour', hint: 'Like the Voyager probes: use every planet along the way.',
    start: { x: 70, y: 250 }, target: { x: 735, y: 430 },
    planets: [
      { x: 250, y: 120, r: 26, gm: 2.2e6, c: ['#ffd29a', '#c4581a'] },
      { x: 470, y: 300, r: 32, gm: 3.4e6, c: ['#9fd4ff', '#1d5fae'] },
      { x: 660, y: 150, r: 22, gm: 1.8e6, c: ['#d6b3ff', '#5a2aa8'] },
    ],
    walls: [{ x: 330, y: 260, w: 24, h: 240 }, { x: 590, y: 280, w: 24, h: 220 }],
  },
];
export const TARGET_R = 24;

export function accel(stage, x, y) {
  let ax = 0, ay = 0;
  for (const p of stage.planets) {
    const dx = p.x - x, dy = p.y - y;
    const d2 = dx * dx + dy * dy;
    const k = p.gm / (d2 * Math.sqrt(d2));
    ax += dx * k; ay += dy * k;
  }
  return [ax, ay];
}

/** Advance a probe {x,y,vx,vy} by dt. Returns 'fly' | 'hit' | 'crash' | 'wall' | 'lost'. */
export function stepProbe(stage, p, dt) {
  const [ax, ay] = accel(stage, p.x, p.y);
  p.vx += ax * dt; p.vy += ay * dt;
  p.x += p.vx * dt; p.y += p.vy * dt;
  const t = stage.target;
  if ((p.x - t.x) ** 2 + (p.y - t.y) ** 2 < TARGET_R * TARGET_R) return 'hit';
  for (const pl of stage.planets) if ((p.x - pl.x) ** 2 + (p.y - pl.y) ** 2 < pl.r * pl.r) return 'crash';
  for (const w of stage.walls) if (p.x > w.x && p.x < w.x + w.w && p.y > w.y && p.y < w.y + w.h) return 'wall';
  if (p.x < -150 || p.x > W + 150 || p.y < -150 || p.y > H + 150) return 'lost';
  return 'fly';
}

/** Launch velocity from a pull-back drag of (dx, dy): the probe flies the opposite way. */
export function launchVelocity(dx, dy) {
  const pull = Math.hypot(dx, dy);
  if (pull < 8) return null;
  const speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, pull * 2.5));
  return { vx: (-dx / pull) * speed, vy: (-dy / pull) * speed, speed };
}

export const SIM_DT = 1 / 240;

/** Fly a whole shot. Used by the solver; the game steps the same function in real time. */
export function simulate(stage, vx, vy, maxT = 16) {
  const p = { x: stage.start.x, y: stage.start.y, vx, vy };
  for (let t = 0; t < maxT; t += SIM_DT) {
    const r = stepProbe(stage, p, SIM_DT);
    if (r !== 'fly') return r;
  }
  return 'timeout';
}
