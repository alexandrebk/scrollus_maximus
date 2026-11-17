// Persistance locale de la progression (localStorage).
// Toute l'app passe par ce module : pour synchroniser plus tard avec Supabase,
// il suffira de remplacer son implémentation en gardant la même API.

const KEY = 'scrollus-maximus:v1';
const STREAK_MIN_CARDS = 5;

const defaults = () => ({
  progress: {},
  favorites: [],
  days: {},
  bestStreak: 0,
  settings: { themes: [], types: [] },
  flags: {},
});

let state = load();
let saveTimer = null;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaults(), ...JSON.parse(raw) } : defaults();
  } catch {
    return defaults();
  }
}

// Écriture différée pour ne pas bloquer le scroll à chaque carte vue.
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 300);
}

export function flush() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Stockage plein ou indisponible (navigation privée) : l'app continue sans persistance.
  }
}

export const dayKey = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const getProgress = (id) => state.progress[id];

export function setProgress(id, progress) {
  state.progress[id] = progress;
  save();
}

export const allProgress = () => state.progress;

export const isFavorite = (id) => state.favorites.includes(id);

export const getFavorites = () => [...state.favorites];

export function toggleFavorite(id) {
  const favorite = !isFavorite(id);
  state.favorites = favorite ? [...state.favorites, id] : state.favorites.filter((fav) => fav !== id);
  save();
  return favorite;
}

export function recordView() {
  const today = dayKey();
  state.days[today] = (state.days[today] || 0) + 1;
  state.bestStreak = Math.max(state.bestStreak, computeStreak());
  save();
  return state.days[today];
}

export const viewsToday = () => state.days[dayKey()] || 0;

export const totalViews = () => Object.values(state.days).reduce((sum, n) => sum + n, 0);

// Série : jours consécutifs avec au moins 5 cartes vues.
// Si aujourd'hui n'est pas encore validé, la série d'hier reste active.
function computeStreak() {
  const cursor = new Date();
  if ((state.days[dayKey(cursor)] || 0) < STREAK_MIN_CARDS) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while ((state.days[dayKey(cursor)] || 0) >= STREAK_MIN_CARDS) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export const getStreak = () => ({ current: computeStreak(), best: state.bestStreak });

export const getSettings = () => structuredClone(state.settings);

export function saveSettings(settings) {
  state.settings = settings;
  save();
}

export const getFlag = (name) => state.flags[name];

export function setFlag(name, value = true) {
  state.flags[name] = value;
  save();
}
