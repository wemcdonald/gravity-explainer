// Progress and settings, kept in this browser only.
const KEY = 'gravity-quest-v1';
const defaults = { name: '', stars: {}, sfx: true, music: true, narrate: false, units: 'lb' };

function load() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...defaults };
  }
}

export const state = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private browsing or blocked storage: the game still works, it just forgets.
  }
}

export function hasStar(levelId, starId) {
  return !!(state.stars[levelId] && state.stars[levelId][starId]);
}

/** Returns true if the star is newly earned. */
export function giveStar(levelId, starId) {
  if (hasStar(levelId, starId)) return false;
  (state.stars[levelId] ||= {})[starId] = true;
  save();
  return true;
}

export function totalStars() {
  return Object.values(state.stars).reduce((n, s) => n + Object.keys(s).length, 0);
}
