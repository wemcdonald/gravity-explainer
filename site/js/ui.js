// Small DOM, canvas and feedback helpers shared by every level.
import { sfx } from './audio.js';

/** h('div', {class:'x', onclick: fn}, child, 'text', ...) */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

let toastTimer = null;
export function toast(msg, ms = 2600) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

export const TAU = Math.PI * 2;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);

/**
 * A canvas with a fixed logical size (W×H) that scales to its container.
 * loop(fn) runs fn(dt, t) every frame and stops by itself once the canvas
 * leaves the page, so levels need no teardown code.
 */
export function makeSim(parent, W = 800, H = 500) {
  const canvas = h('canvas', { width: W * 2, height: H * 2 });
  const wrap = h('div', { class: 'sim' }, canvas);
  parent.append(wrap);
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };
  const sim = {
    canvas, ctx, wrap, W, H, pos,
    /** handlers: {down(p,e), move(p,e), up(p,e)} in logical coordinates */
    pointer({ down, move, up }) {
      let active = false;
      canvas.addEventListener('pointerdown', (e) => {
        active = true;
        canvas.setPointerCapture?.(e.pointerId);
        down?.(pos(e), e);
        e.preventDefault();
      });
      canvas.addEventListener('pointermove', (e) => move?.(pos(e), e, active));
      const end = (e) => {
        if (!active) return;
        active = false;
        up?.(pos(e), e);
      };
      canvas.addEventListener('pointerup', end);
      canvas.addEventListener('pointercancel', end);
    },
    loop(fn) {
      let last = performance.now();
      let t = 0;
      const frame = (now) => {
        if (!canvas.isConnected) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        t += dt;
        fn(dt, t);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    },
  };
  return sim;
}

/** A row of choice chips. Returns {el, get(), set(v)}. */
export function chips(label, options, initial, onchange) {
  let value = initial;
  const el = h('div', { class: 'group' }, label ? h('span', { class: 'group-label' }, label) : null);
  const btns = options.map((o) => {
    const b = h('button', { class: 'chip', onclick: () => { sfx('click'); api.set(o.value); onchange?.(o.value); } }, o.label);
    el.append(b);
    return b;
  });
  const api = {
    el,
    get: () => value,
    set(v) {
      value = v;
      btns.forEach((b, i) => b.classList.toggle('sel', options[i].value === v));
    },
    disable(d) { btns.forEach((b) => (b.disabled = d)); },
  };
  api.set(initial);
  return api;
}

export function slider({ min, max, step = 1, value, oninput }) {
  return h('input', { type: 'range', min, max, step, value, oninput: (e) => oninput(+e.target.value) });
}

/** Draw text with an emoji font-friendly default. */
export function text(ctx, str, x, y, { size = 16, color = '#fff', align = 'center', weight = 600, base = 'middle' } = {}) {
  ctx.font = `${weight} ${size}px Fredoka, ui-rounded, system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.fillText(str, x, y);
}

/** Deterministic star backdrop for sim canvases. */
export function drawStars(ctx, W, H, seed = 7, n = 90) {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = 0.25 + r() * 0.6;
    ctx.fillStyle = '#fff';
    const size = r() < 0.9 ? 1.2 : 2.2;
    ctx.fillRect(r() * W, r() * H, size, size);
  }
  ctx.globalAlpha = 1;
}

export function ball(ctx, x, y, r, c1, c2 = '#000') {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

// ---- confetti ----
const bits = [];
let confettiRunning = false;
export function confetti(n = 120) {
  const c = document.getElementById('confetti');
  const w = (c.width = innerWidth);
  const hgt = (c.height = innerHeight);
  const colors = ['#ffd166', '#ff8fd0', '#6ec3ff', '#5be3a0', '#fff'];
  for (let i = 0; i < n; i++) {
    bits.push({
      x: w / 2 + rand(-80, 80), y: hgt * 0.45, vx: rand(-9, 9), vy: rand(-16, -4),
      r: rand(4, 9), c: colors[i % colors.length], a: rand(0, TAU), va: rand(-0.3, 0.3), life: rand(1.2, 2.2),
    });
  }
  if (confettiRunning) return;
  confettiRunning = true;
  const g = c.getContext('2d');
  const step = () => {
    g.clearRect(0, 0, c.width, c.height);
    for (const b of bits) {
      b.vy += 0.45; // even confetti obeys gravity
      b.x += b.vx; b.y += b.vy; b.a += b.va; b.life -= 1 / 60;
      g.save();
      g.translate(b.x, b.y);
      g.rotate(b.a);
      g.globalAlpha = clamp(b.life, 0, 1);
      g.fillStyle = b.c;
      g.fillRect(-b.r, -b.r / 2, b.r * 2, b.r);
      g.restore();
    }
    for (let i = bits.length - 1; i >= 0; i--) if (bits[i].life <= 0 || bits[i].y > c.height + 40) bits.splice(i, 1);
    if (bits.length) requestAnimationFrame(step);
    else { confettiRunning = false; g.clearRect(0, 0, c.width, c.height); }
  };
  requestAnimationFrame(step);
}

/** Newt, the space newt who guides the player. Named after Isaac Newton. */
export const NEWT_SVG = `
<svg viewBox="0 0 100 100" aria-hidden="true">
  <circle cx="50" cy="50" r="44" fill="#bfe4ff" opacity=".28" stroke="#dff1ff" stroke-width="4"/>
  <ellipse cx="50" cy="56" rx="29" ry="25" fill="#ff9f43"/>
  <ellipse cx="50" cy="66" rx="18" ry="11" fill="#ffd9a8"/>
  <circle cx="36" cy="42" r="11" fill="#ff9f43"/><circle cx="64" cy="42" r="11" fill="#ff9f43"/>
  <circle cx="36" cy="42" r="8" fill="#fff"/><circle cx="64" cy="42" r="8" fill="#fff"/>
  <circle cx="38" cy="43" r="4" fill="#1b1b3a"/><circle cx="66" cy="43" r="4" fill="#1b1b3a"/>
  <circle cx="39.5" cy="41.5" r="1.4" fill="#fff"/><circle cx="67.5" cy="41.5" r="1.4" fill="#fff"/>
  <path d="M40 64 Q50 73 60 64" fill="none" stroke="#8a3b12" stroke-width="3" stroke-linecap="round"/>
  <circle cx="30" cy="60" r="3" fill="#ff7b6b" opacity=".7"/><circle cx="70" cy="60" r="3" fill="#ff7b6b" opacity=".7"/>
  <path d="M22 22 Q30 12 40 16" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>
</svg>`;
