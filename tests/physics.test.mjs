// Checks that the numbers the app teaches match real physics.
import test from 'node:test';
import assert from 'node:assert/strict';
import { THINGS, PLACES, fallTime, winner } from '../site/app/levels/drop.js';
import { WORLDS, jumpHeight } from '../site/app/levels/hop.js';
import { pullForce } from '../site/app/levels/pull.js';
import { classify, V_CIRC, V_ESC } from '../site/app/levels/cannon.js';
import { THINGS as SQUISH, escapeSpeed, fmtLen, RS, ISCO, ENGINE, ORB_RADII, inwardDrift, radialSpeed } from '../site/app/levels/blackhole.js';
import { chirpFor } from '../site/app/levels/waves.js';
import { traceRay, RAYS } from '../site/app/levels/bendy.js';

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

test('drop: without air everything takes sqrt(2h/g)', () => {
  for (const t of Object.values(THINGS)) {
    near(fallTime(t, PLACES.chamber), Math.sqrt(20 / 9.81), 0.01);
    near(fallTime(t, PLACES.moon), Math.sqrt(20 / 1.62), 0.01);
  }
});
test('drop: air only matters for floaty things', () => {
  assert.equal(winner(THINGS.ball, THINGS.feather, PLACES.earth), 'left');
  assert.equal(winner(THINGS.paper, THINGS.hammer, PLACES.earth), 'right');
  assert.equal(winner(THINGS.elephant, THINGS.ball, PLACES.earth), 'same');
  assert.equal(winner(THINGS.hammer, THINGS.feather, PLACES.moon), 'same');
});
test('hop: jump heights match the stars to grab', () => {
  near(jumpHeight(WORLDS.earth.g), 0.5, 0.001);
  near(jumpHeight(WORLDS.mars.g), 1.3, 0.1);
  near(jumpHeight(WORLDS.moon.g), 3.0, 0.1);
  near(jumpHeight(WORLDS.pluto.g), 7.9, 0.1);
  // each star needs its own world: no other world tops out within grabbing range
  for (const [star, world] of [[1.3, 'mars'], [3.0, 'moon'], [7.9, 'pluto']]) {
    const reach = Object.entries(WORLDS).filter(([, w]) => Math.abs(jumpHeight(w.g) - star) < 0.45).map(([k]) => k);
    assert.deepEqual(reach, [world]);
  }
});
test('pull: inverse-square law', () => {
  assert.equal(pullForce(4, 4, 2), 4 * pullForce(4, 4, 4));
  assert.equal(pullForce(3, 3, 3), pullForce(3, 3, 1) / 9);
  assert.equal(pullForce(2, 8, 2), 2 * pullForce(2, 4, 2));
});
test('cannon: orbit and escape speeds', () => {
  near(V_CIRC, 7.56, 0.02);
  near(V_ESC, 10.69, 0.02);
  assert.equal(classify(3), 'crash');
  assert.equal(classify(7.6), 'circle');
  assert.equal(classify(9), 'ellipse');
  assert.equal(classify(10.6), 'ellipse');
  assert.equal(classify(10.8), 'escape');
  // the slider moves in 0.1 km/s steps: at least one step must give the perfect circle
  assert.ok([7.4, 7.5, 7.6, 7.7].some((v) => classify(v) === 'circle'));
});
test('black hole: escape speeds and sizes', () => {
  near(escapeSpeed(SQUISH.earth, SQUISH.earth.r), 11186, 30); // 11.2 km/s
  near(escapeSpeed(SQUISH.sun, SQUISH.sun.r), 617600, 1500); // 618 km/s
  near(escapeSpeed(SQUISH.moon, SQUISH.moon.r), 2375, 20); // 2.4 km/s
  near(escapeSpeed(SQUISH.earth, SQUISH.earth.rs), 299792458, 1);
  assert.equal(fmtLen(SQUISH.earth.rs * 2), '1.8 cm');
  assert.equal(fmtLen(SQUISH.sun.rs * 2), '5.9 km');
});
test('horizon run: holding a finger on any orb is survivable and collects it', () => {
  for (const orb of ORB_RADII) {
    let r = 200;
    for (let t = 0; t < 20; t += 1 / 360) r += radialSpeed(r, orb) / 360;
    assert.ok(r > RS + 3, `ship died holding at orb ${orb} (r=${r.toFixed(1)})`);
    assert.ok(Math.abs(r - orb) < 14, `ship settles ${Math.abs(r - orb).toFixed(1)} px from orb ${orb}`);
    assert.ok(radialSpeed(r, 235) > 20, `cannot climb out from orb ${orb}`);
  }
});
test('horizon run: the danger zone is really dangerous', () => {
  assert.equal(inwardDrift(ISCO + 1), 0);
  let r = ISCO - 3; // let go just inside the last stable orbit
  let t = 0;
  for (; t < 60 && r > RS + 3; t += 1 / 360) r += radialSpeed(r, r) / 360;
  assert.ok(r <= RS + 3 && t > 2, `drifting in should be fatal but slow enough to react (took ${t.toFixed(1)} s)`);
  assert.ok(inwardDrift(RS + 4) > ENGINE, 'right at the horizon the engine must lose');
});
test('waves: heavier pairs chirp lower and shorter', () => {
  const light = chirpFor(10, 10), heavy = chirpFor(60, 60);
  assert.ok(heavy.f1 < light.f1 && heavy.seconds < light.seconds);
  assert.ok(heavy.f1 > 250, 'still audible on small speakers');
  assert.ok(heavy.seconds > 1);
});
test('bendy: straight light misses the telescope, bent light can reach it', () => {
  const far = { x: 400, y: -5000 };
  assert.ok(RAYS.every((y) => traceRay(y, far, 7, 16).miss > 60));
  let found = 0;
  for (let x = 150; x <= 650; x += 10) for (let y = 40; y <= 420; y += 10) if (RAYS.some((r) => traceRay(r, { x, y }, 7, 16).miss < 20)) found++;
  assert.ok(found >= 15, `only ${found} lens positions work`);
});
