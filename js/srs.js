// Répétition espacée façon boîtes de Leitner : intervalles de 1, 3, 7, 21 et 60 jours.

export const INTERVALS = [1, 3, 7, 21, 60];
const DAY_MS = 24 * 60 * 60 * 1000;
const KNOWN_BOX = 2;
const MIN_EASE = 1.3;
const MAX_EASE = 3;

export const newProgress = () => ({ status: 'new', box: -1, interval: 0, ease: 2.5, dueAt: 0, seen: 0 });

const statusFor = (box) => (box >= KNOWN_BOX ? 'known' : 'learning');

function moveTo(progress, box, now) {
  const interval = box < 0 ? 0 : INTERVALS[box];
  return { ...progress, box, interval, status: statusFor(box), dueAt: now + interval * DAY_MS };
}

// Simple passage devant la carte : une carte nouvelle entre en apprentissage.
export function markSeen(progress, now = Date.now()) {
  const seen = { ...progress, seen: progress.seen + 1, lastSeenAt: now };
  return progress.status === 'new' ? moveTo(seen, 0, now) : seen;
}

// « Je connais » ou bonne réponse : la carte monte d'une boîte.
export function promote(progress, now = Date.now()) {
  const next = moveTo(progress, Math.min(progress.box + 1, INTERVALS.length - 1), now);
  return { ...next, ease: Math.min(MAX_EASE, progress.ease + 0.1) };
}

// « À revoir » ou mauvaise réponse : retour en première boîte, et la carte redevient due tout de suite.
export function demote(progress, now = Date.now()) {
  return {
    ...progress,
    box: 0,
    interval: 0,
    status: 'learning',
    dueAt: now,
    ease: Math.max(MIN_EASE, progress.ease - 0.2),
  };
}

export const isDue = (progress, now = Date.now()) => progress.status !== 'new' && progress.dueAt <= now;
