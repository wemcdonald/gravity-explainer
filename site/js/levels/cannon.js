// Mission 4: Newton's cannon. An orbit is falling around a planet and always missing it.
import { h, makeSim, slider, text, drawStars, ball, toast, TAU } from '../ui.js';
import { sfx } from '../audio.js';

export const MU = 398600; // Earth's gravity strength, km³/s²
export const R = 6371; // Earth's radius, km
export const R0 = R + 600; // top of our (very exaggerated) mountain
export const V_CIRC = Math.sqrt(MU / R0);
export const V_ESC = Math.sqrt((2 * MU) / R0);

/** What a horizontal shot at v km/s does: 'crash' | 'circle' | 'ellipse' | 'escape'. */
export function classify(v) {
  const energy = (v * v) / 2 - MU / R0;
  if (energy >= 0) return 'escape';
  const a = -MU / (2 * energy);
  const other = 2 * a - R0; // the far (or near) end of the ellipse
  if (other < R) return 'crash';
  const e = Math.abs(other - R0) / (other + R0);
  return e < 0.03 ? 'circle' : 'ellipse';
}

function build(el, c) {
  const sim = makeSim(el, 800, 500);
  const { ctx, W, H } = sim;
  const CX = 400, CY = 285, S0 = 115 / R;
  let speed = 3;
  let scale = S0;
  let shot = null; // {x,y,vx,vy,trail,angle,state,kind}
  let crashes = 0;
  const did = new Set();
  const seen = new Set();
  const say = (k, html) => { if (!seen.has(k)) { seen.add(k); c.whoa(html); } };

  const readout = h('span', { class: 'big-num' });
  const paint = () => { readout.textContent = `${speed.toFixed(1)} km/s`; mph.textContent = `= ${Math.round(speed * 2237).toLocaleString()} mph`; };
  const mph = h('span', { class: 'readout' });
  const sl = slider({ min: 0.5, max: 12, step: 0.1, value: speed, oninput: (v) => { speed = v; sfx('tick'); paint(); } });
  const fire = () => {
    sfx('launch');
    shot = { x: 0, y: -R0, vx: speed, vy: 0, trail: [], angle: 0, state: 'fly', kind: classify(speed), v0: speed, orbits: 0 };
  };
  el.append(
    h('div', { class: 'controls' }, h('span', { class: 'group-label' }, 'Cannon speed'), readout, mph),
    h('div', { class: 'controls' }, sl, h('button', { class: 'btn danger', onclick: fire }, '💥 FIRE!')));
  paint();

  function ended() {
    const s = shot;
    if (s.state === 'crash') {
      crashes++;
      const km = Math.round(Math.abs(s.angle) * R);
      sfx('crash');
      toast(`💥 Landed ${km.toLocaleString()} km away. ${km > 9000 ? 'So close to orbit!' : 'More speed!'}`);
      say('fall', 'The cannonball is <strong>always falling</strong>. Faster shots just travel farther around the curve of the Earth before they land.');
      if (crashes === 4) say('hint', 'Hint: the Space Station zips along at about <strong>7.7 km/s</strong>. That’s 17,000 mph!');
    } else if (s.state === 'escape') {
      sfx('win'); did.add('escape');
      toast('🚀 Escaped! It’s never coming back.');
      say('esc', `<strong>Escape velocity!</strong> Above about ${V_ESC.toFixed(1)} km/s the ball outruns Earth’s gravity forever. Gravity keeps slowing it down but never quite stops it. The Voyager probes did this to the whole Sun!`);
    }
    if (did.has('escape') && did.has('circle')) c.award('pro');
  }

  function orbited() {
    const s = shot;
    c.award('orbit');
    if (s.kind === 'circle') {
      did.add('circle'); sfx('win'); toast('🎯 A perfect circle orbit!');
      say('circle', '<strong>You’re in orbit!</strong> The ball falls toward Earth the whole time, but it’s going sideways so fast that the ground curves away just as quickly. <strong>It falls forever and never lands.</strong>');
    } else {
      sfx('win'); toast('🥚 An oval orbit! (Try for a perfect circle too.)');
      say('ellipse', '<strong>Oval orbits are called ellipses.</strong> The ball slows down as it climbs away and speeds back up as it falls in, like a skateboarder in a half-pipe. Comets do this around the Sun.');
    }
    say('iss', 'Astronauts on the Space Station float, but <strong>not</strong> because gravity is gone. Gravity up there is still 90% as strong! They float because they are falling around the Earth, along with their whole spaceship.');
    if (did.has('escape') && did.has('circle')) c.award('pro');
  }

  function step(dt) {
    const s = shot;
    const r0 = Math.hypot(s.x, s.y);
    const total = dt * 650 * Math.pow(r0 / R0, 1.5);
    const n = 24, d = total / n;
    for (let i = 0; i < n; i++) {
      const r = Math.hypot(s.x, s.y);
      const k = -MU / (r * r * r);
      s.vx += s.x * k * d; s.vy += s.y * k * d;
      const px = s.x, py = s.y;
      s.x += s.vx * d; s.y += s.vy * d;
      s.angle += Math.atan2(px * s.y - py * s.x, px * s.x + py * s.y);
      const rn = Math.hypot(s.x, s.y);
      if (rn <= R) { s.state = 'crash'; return ended(); }
      if (s.kind === 'escape' && rn > R * 14) { s.state = 'escape'; return ended(); }
    }
    const last = s.trail[s.trail.length - 1];
    if (!last || Math.hypot(s.x - last[0], s.y - last[1]) > 6 / scale) { s.trail.push([s.x, s.y]); if (s.trail.length > 1500) s.trail.shift(); }
    if (Math.floor(Math.abs(s.angle) / TAU) > s.orbits) { s.orbits++; if (s.orbits === 1) orbited(); }
  }

  sim.loop((dt) => {
    if (shot && shot.state === 'fly') step(dt);
    const far = shot ? Math.hypot(shot.x, shot.y) : R0;
    const want = Math.min(S0, 205 / far);
    scale += (want - scale) * Math.min(1, dt * 2.5);
    const sx = (x) => CX + x * scale, sy = (y) => CY + y * scale;

    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, W, H);
    drawStars(ctx, W, H, 33, 110);
    // faint guide circle at the mountain-top height
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.setLineDash([4, 6]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(CX, CY, R0 * scale, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    // mountain + cannon
    const rp = R * scale;
    ctx.fillStyle = '#8b6b4a';
    ctx.beginPath(); ctx.moveTo(CX - rp * 0.16, CY - rp * 0.97); ctx.lineTo(CX, sy(-R0)); ctx.lineTo(CX + rp * 0.16, CY - rp * 0.97); ctx.fill();
    ball(ctx, CX, CY, rp, '#6fc3ff', '#0d3d86');
    ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, rp, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(86,190,110,.75)';
    for (const [dx, dy, rx, ry] of [[-0.3, -0.25, 0.35, 0.22], [0.35, 0.1, 0.25, 0.4], [-0.15, 0.55, 0.3, 0.16], [0.1, -0.7, 0.2, 0.1]]) {
      ctx.beginPath(); ctx.ellipse(CX + dx * rp, CY + dy * rp, rx * rp, ry * rp, 0.4, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#d7dbe8'; ctx.fillRect(CX - 3, sy(-R0) - 5, 16 * (scale / S0) + 6, 6);

    if (shot) {
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2.5; ctx.beginPath();
      shot.trail.forEach(([x, y], i) => (i ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y))));
      ctx.lineTo(sx(shot.x), sy(shot.y)); ctx.stroke();
      if (shot.state === 'crash') text(ctx, '💥', sx(shot.x), sy(shot.y), { size: 30 });
      else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx(shot.x), sy(shot.y), 5, 0, TAU); ctx.fill(); }
      if (shot.state === 'fly') {
        const v = Math.hypot(shot.vx, shot.vy);
        text(ctx, `speed now ${v.toFixed(1)} km/s · height ${Math.round(far - R).toLocaleString()} km${shot.orbits ? ` · laps ${shot.orbits}` : ''}`, 400, 22, { size: 16, color: '#cfd6ff' });
      }
    } else {
      text(ctx, 'Set the speed, then FIRE the cannon sideways off the mountain', 400, 22, { size: 16, color: '#cfd6ff' });
    }
  });
}

export default {
  id: 'cannon', title: 'Newton’s Cannon', icon: '💥', color: '#ffd166',
  tagline: 'Fire a cannonball so fast it never lands.',
  stars: [
    { id: 'orbit', label: 'Get the cannonball all the way around the Earth' },
    { id: 'pro', label: 'Pro shots: one PERFECT circle orbit, and one escape into deep space' },
    { id: 'quiz', label: 'Finish the quiz' },
  ],
  stages: [{
    say: 'Newton imagined a cannon on a super tall mountain. Shoot slowly and the ball lands nearby. But what if you shoot <b>really, really fast</b>? Find out why the Moon doesn’t fall down!',
    goals: ['orbit', 'pro'], build,
  }],
  quiz: [
    { q: 'Why doesn’t the Moon crash into the Earth?', opts: ['It’s falling, but moving sideways so fast it keeps missing', 'There’s no gravity in space', 'It’s held up by the Sun'], a: 0, why: 'The Moon is in orbit: always falling toward Earth, always missing.' },
    { q: 'Astronauts on the Space Station float because…', opts: ['They’re falling around the Earth together with the station', 'Gravity doesn’t reach that high', 'Their suits are filled with helium'], a: 0, why: 'Gravity there is still about 90% as strong as on the ground. Floating is what constant falling feels like.' },
    { q: 'What happens if you launch FASTER than escape velocity?', opts: ['You leave and never fall back', 'You go into a smaller orbit', 'You stop in mid-space'], a: 0, why: 'Above escape velocity, gravity can slow you down but never bring you back.' },
  ],
};
