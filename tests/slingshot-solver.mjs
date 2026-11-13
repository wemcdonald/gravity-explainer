// Brute-force every launch angle and power for each Slingshot stage and report
// how much of the aiming space wins. Fails if a stage is unsolvable, or if a
// stage that is meant to need gravity can be won with gravity switched off.
import { STAGES, simulate, MAX_SPEED, MIN_SPEED } from '../site/app/slingshot-core.js';

let failed = false;
STAGES.forEach((stage, i) => {
  const noGravity = { ...stage, planets: stage.planets.map((p) => ({ ...p, gm: 0 })) };
  let wins = 0, straightWins = 0, total = 0, best = null, widest = 0, runLen = 0;
  for (let speed = MIN_SPEED; speed <= MAX_SPEED; speed += 10) {
    runLen = 0;
    for (let deg = 0; deg < 360; deg += 0.5) {
      const a = (deg * Math.PI) / 180;
      const vx = Math.cos(a) * speed, vy = Math.sin(a) * speed;
      total++;
      if (simulate(stage, vx, vy) === 'hit') {
        wins++; runLen++;
        if (runLen > widest) { widest = runLen; best = { speed, deg }; }
      } else runLen = 0;
      if (simulate(noGravity, vx, vy) === 'hit') straightWins++;
    }
  }
  const pct = ((100 * wins) / total).toFixed(2);
  const needsGravity = i > 0;
  const ok = wins > 0 && (!needsGravity || straightWins === 0);
  if (!ok) failed = true;
  console.log(`${ok ? 'ok  ' : 'FAIL'} stage ${i + 1} ${stage.name.padEnd(14)} wins ${pct}% of shots, widest window ${(widest * 0.5).toFixed(1)}° at speed ${best?.speed}, angle ${best?.deg}°; straight-line wins: ${straightWins}`);
});
process.exit(failed ? 1 : 0);
