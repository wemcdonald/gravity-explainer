import { state, save, hasStar, giveStar, totalStars } from './store.js';
import { sfx, unlock, startMusic, stopMusic } from './audio.js';
import { speak, hush, canSpeak } from './speech.js';
import { h, toast, confetti, NEWT_SVG } from './ui.js';
import { LEVELS } from './levels/index.js';

const app = document.getElementById('app');
const ALL_STARS = LEVELS.reduce((n, l) => n + l.stars.length, 0);
const RANKS = [
  [0, 'Space Cadet'], [4, 'Rocket Rookie'], [9, 'Orbit Ace'], [14, 'Star Pilot'],
  [19, 'Gravity Genius'], [ALL_STARS, 'Master of Gravity'],
];
const rank = (n) => RANKS.filter(([min]) => n >= min).pop()[1];

// ---------- top bar ----------
function refreshTop() {
  document.getElementById('star-num').textContent = `${totalStars()}/${ALL_STARS}`;
  document.getElementById('sfx-btn').classList.toggle('off', !state.sfx);
  document.getElementById('music-btn').classList.toggle('off', !state.music);
  document.getElementById('narrate-btn').classList.toggle('off', !state.narrate);
}
document.getElementById('home-btn').onclick = () => { sfx('click'); go('#/map'); };
document.getElementById('sfx-btn').onclick = () => { state.sfx = !state.sfx; save(); refreshTop(); sfx('pop'); };
document.getElementById('music-btn').onclick = () => {
  state.music = !state.music; save(); refreshTop();
  if (state.music) startMusic(); else stopMusic();
};
document.getElementById('narrate-btn').onclick = () => {
  state.narrate = !state.narrate; save(); refreshTop();
  if (!state.narrate) hush();
  toast(state.narrate ? '🗣️ Newt will read out loud' : 'Read-aloud is off');
};
if (!canSpeak) document.getElementById('narrate-btn').hidden = true;
// Browsers only allow sound after a tap, so wake audio up on the first one.
addEventListener('pointerdown', unlock, { once: true });

// ---------- starfield backdrop ----------
function paintStars() {
  const c = document.getElementById('starfield');
  c.width = innerWidth; c.height = innerHeight;
  const g = c.getContext('2d');
  for (let i = 0; i < 160; i++) {
    g.globalAlpha = 0.2 + Math.random() * 0.7;
    g.fillStyle = ['#fff', '#cfe0ff', '#ffe9c4'][i % 3];
    const s = Math.random() < 0.92 ? 1.3 : 2.4;
    g.fillRect(Math.random() * c.width, Math.random() * c.height, s, s);
  }
}
paintStars();
addEventListener('resize', paintStars);

// ---------- routing ----------
function go(hash) {
  if (location.hash === hash) route(); else location.hash = hash;
}
function route() {
  hush();
  const [, page, id] = location.hash.split('/');
  app.replaceChildren();
  scrollTo(0, 0);
  if (!state.name || !page) return welcome();
  if (page === 'level') {
    const level = LEVELS.find((l) => l.id === id);
    if (level) return showLevel(level);
  }
  if (page === 'cert') return certificate();
  map();
}
addEventListener('hashchange', route);

// ---------- welcome ----------
function welcome() {
  const input = h('input', { type: 'text', maxlength: 16, placeholder: 'Your astronaut name', value: state.name, autocomplete: 'off' });
  const start = () => {
    state.name = input.value.trim() || 'Astronaut';
    save();
    unlock();
    sfx('launch');
    go('#/map');
  };
  input.addEventListener('keydown', (e) => e.key === 'Enter' && start());
  app.append(
    h('div', { class: 'welcome' },
      h('div', { class: 'float', style: { width: '130px', margin: '0 auto' }, html: NEWT_SVG }),
      h('h1', {}, 'Gravity Quest'),
      h('p', {}, 'Why do things fall? Why doesn’t the Moon? What is a black hole, really? Play 8 missions to find out.'),
      h('div', {}, input),
      h('button', { class: 'btn go', onclick: start }, '🚀 Launch!'),
    ),
  );
}

// ---------- mission map ----------
function starRow(level) {
  return h('div', { class: 'stars' }, level.stars.map((s) => h('span', { class: hasStar(level.id, s.id) ? '' : 'dim', title: s.label }, '⭐')));
}
const levelDone = (l) => l.stars.every((s) => hasStar(l.id, s.id));

function map() {
  const n = totalStars();
  const next = LEVELS.find((l) => !levelDone(l));
  app.append(
    h('div', { class: 'map-head' },
      h('h2', {}, `Hi, ${state.name}!`),
      h('span', { class: 'rank' }, `Rank: ${rank(n)}`),
    ),
    h('div', { class: 'progress-bar' }, h('div', { style: { width: `${(100 * n) / ALL_STARS}%` } })),
    h('div', { class: 'missions' }, LEVELS.map((l, i) =>
      h('button', {
        class: `mission ${l === next ? 'next' : ''} ${levelDone(l) ? 'done' : ''}`,
        style: { '--c': l.color },
        onclick: () => { sfx('whoosh'); go(`#/level/${l.id}`); },
      },
        h('span', { class: 'num' }, i + 1),
        h('span', { class: 'ico' }, l.icon),
        h('h3', {}, l.title),
        h('p', {}, l.tagline),
        starRow(l),
      ))),
  );
  if (n === ALL_STARS) {
    app.append(h('p', { style: { textAlign: 'center', marginTop: '22px' } },
      h('button', { class: 'btn', onclick: () => go('#/cert') }, '🏆 Get your certificate')));
  }
  app.append(h('p', { class: 'noprint', style: { textAlign: 'center', marginTop: '26px' } },
    h('button', { class: 'btn secondary small', onclick: () => { state.name = ''; save(); go('#/'); } }, 'Change name')));
}

// ---------- certificate ----------
function certificate() {
  if (totalStars() < ALL_STARS) return map();
  sfx('star'); confetti(260);
  app.append(
    h('div', { class: 'cert' },
      h('div', { style: { width: '110px', margin: '0 auto' }, html: NEWT_SVG }),
      h('div', {}, 'This certifies that'),
      h('div', { class: 'name' }, state.name),
      h('div', {}, 'collected every star and is officially a'),
      h('h2', {}, '🏆 Master of Gravity 🏆'),
      h('div', {}, `${ALL_STARS} stars · 8 missions · from falling apples to black holes`),
      h('p', {}, new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })),
    ),
    h('div', { class: 'stage-nav' },
      h('button', { class: 'btn secondary', onclick: () => go('#/map') }, '← Mission map'),
      h('button', { class: 'btn', onclick: () => print() }, '🖨️ Print it'),
    ),
  );
}

// ---------- level shell ----------
function showLevel(level) {
  const stages = [...level.stages, { say: 'Quiz time! No rush, and you can try again if you miss one.', goals: ['quiz'], build: quizStage }];
  let cur = 0;

  const starsEl = h('div', { class: 'level-stars' });
  const pips = h('div', { class: 'pips' });
  const newtEl = h('div', { class: 'newt', html: NEWT_SVG });
  const bubbleText = h('span');
  let said = '';
  const talk = () => speak(said, {
    onstart: () => newtEl.classList.add('talking'),
    onend: () => newtEl.classList.remove('talking'),
  });
  const bubble = h('div', { class: 'bubble' }, bubbleText,
    canSpeak ? h('button', { class: 'say', title: 'Read this out loud', onclick: talk }, '🔊') : null);
  newtEl.append(bubble);
  const stageEl = h('div');
  const whoaEl = h('div');
  const goalsEl = h('ul', { class: 'goals' });
  const prevBtn = h('button', { class: 'btn secondary', onclick: () => show(cur - 1) }, '← Back');
  const nextBtn = h('button', { class: 'btn', onclick: () => (cur === stages.length - 1 ? go('#/map') : show(cur + 1)) });

  const paintStarsRow = (popId) => {
    starsEl.replaceChildren(...level.stars.map((s) =>
      h('span', { class: `${hasStar(level.id, s.id) ? '' : 'dim'} ${s.id === popId ? 'pop' : ''}`, title: s.label }, '⭐')));
  };
  const paintGoals = () => {
    const ids = stages[cur].goals || [];
    goalsEl.replaceChildren(...ids.map((id) => {
      const s = level.stars.find((x) => x.id === id);
      return h('li', { class: hasStar(level.id, id) ? 'done' : '' }, s.label);
    }));
  };

  const ctx = {
    level,
    say(html) {
      said = html;
      bubbleText.innerHTML = html;
      if (state.narrate) talk();
    },
    whoa(html) {
      sfx('ding');
      whoaEl.prepend(h('div', { class: 'whoa', html: `🤯 ${html}` }));
    },
    award(starId) {
      if (!giveStar(level.id, starId)) return false;
      const star = level.stars.find((s) => s.id === starId);
      sfx('star'); confetti();
      toast(`⭐ Star earned: ${star.label}`);
      paintStarsRow(starId); paintGoals(); refreshTop();
      const badge = document.getElementById('star-count');
      badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump');
      if (totalStars() === ALL_STARS) setTimeout(() => toast('🏆 You got EVERY star! Certificate unlocked on the map.', 5000), 2800);
      return true;
    },
  };

  function show(i) {
    cur = i;
    hush();
    const stage = stages[cur];
    pips.replaceChildren(...stages.map((_, k) =>
      h('button', { class: `pip ${k <= cur ? 'on' : ''} ${k === cur ? 'cur' : ''}`, 'aria-label': `Part ${k + 1}`, onclick: () => show(k) })));
    stageEl.replaceChildren();
    whoaEl.replaceChildren();
    ctx.say(stage.say);
    paintGoals();
    stage.build(stageEl, ctx);
    prevBtn.style.visibility = cur ? 'visible' : 'hidden';
    nextBtn.textContent = cur === stages.length - 1 ? '🗺️ Mission map' : 'Next →';
    scrollTo(0, 0);
  }

  function quizStage(el, c) {
    let n = 0;
    const qs = level.quiz;
    const render = () => {
      el.replaceChildren();
      if (n >= qs.length) {
        c.award('quiz');
        sfx('win');
        el.append(h('div', { class: 'panel', style: { textAlign: 'center' } },
          h('div', { style: { fontSize: '60px' } }, '🎉'),
          h('h3', {}, 'Quiz complete!'),
          h('p', {}, levelDone(level) ? 'You earned every star in this mission!' : 'Go back to grab any stars you missed.'),
          h('button', { class: 'btn secondary small', onclick: () => { n = 0; render(); } }, 'Play the quiz again')));
        return;
      }
      const q = qs[n];
      const order = q.opts.map((_, i) => i).sort(() => Math.random() - 0.5);
      const why = h('div', { class: 'why' });
      const opts = h('div', { class: 'opts' }, order.map((i) =>
        h('button', {
          class: 'opt',
          onclick: (e) => {
            if (why.childNodes.length) return;
            if (i === q.a) {
              e.currentTarget.classList.add('right');
              sfx('coin');
              why.append(h('div', { class: 'whoa', html: `✅ ${q.why}` }),
                h('p', {}, h('button', { class: 'btn', onclick: () => { n++; render(); } }, n === qs.length - 1 ? 'Finish! 🎉' : 'Next question →')));
              if (state.narrate) speak(q.why);
            } else {
              e.currentTarget.classList.add('wrong');
              sfx('wrong');
              e.currentTarget.disabled = true;
            }
          },
        }, q.opts[i])));
      el.append(h('div', { class: 'panel quiz' },
        h('div', { class: 'qcount' }, `Question ${n + 1} of ${qs.length}`),
        h('h3', {}, q.q), opts, why));
      if (state.narrate) speak(q.q);
    };
    render();
  }

  app.append(
    h('div', { style: { '--c': level.color } },
      h('div', { class: 'level-head' },
        h('button', { class: 'icon-btn', onclick: () => go('#/map'), 'aria-label': 'Back to map' }, '←'),
        h('h2', {}, `${level.icon} ${level.title}`), starsEl),
      pips, newtEl, stageEl, goalsEl, whoaEl,
      h('div', { class: 'stage-nav' }, prevBtn, nextBtn)),
  );
  paintStarsRow();
  show(0);
}

refreshTop();
route();
