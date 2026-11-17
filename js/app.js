// Point d'entrée : charge les cartes, branche le feed, les interactions et le service worker.

import { revealQuizAnswer } from './cards.js';
import { getCards } from './data-source.js';
import { Feed } from './feed.js';
import { demote, markSeen, newProgress, promote } from './srs.js';
import * as storage from './storage.js';
import * as ui from './ui.js';

const DOUBLE_TAP_MS = 280;
const IOS_HINT_AFTER = 8;

const feedNode = document.getElementById('feed');
let allCards = [];
let cardsById = new Map();

const progressOf = (id) => storage.getProgress(id) || newProgress();
const updateProgress = (id, transform) => storage.setProgress(id, transform(progressOf(id)));

const ctx = {
  getCard: (id) => cardsById.get(id),
  isFavorite: storage.isFavorite,
  getStreak: storage.getStreak,
  viewsToday: storage.viewsToday,
};

let maybeHintIos = () => {};

const feed = new Feed(feedNode, { ctx, onActive: handleActive });

function handleActive(item, node) {
  if (item.kind === 'summary') {
    node.querySelector('.summary__count').textContent = `Tu as vu ${storage.viewsToday()} cartes aujourd'hui`;
    return;
  }
  if (item.kind !== 'card') return;

  updateProgress(item.card.id, markSeen);
  const views = storage.recordView();
  ui.updateStreak(storage.getStreak());
  if (views === IOS_HINT_AFTER) maybeHintIos();
}

function filteredCards() {
  const { themes, types } = storage.getSettings();
  return allCards.filter((card) => (!themes.length || themes.includes(card.theme)) && (!types.length || types.includes(card.type)));
}

const reloadFeed = () => feed.load(filteredCards());

function toggleReveal(section) {
  if (section?.classList.contains('card--latin')) section.classList.toggle('is-hidden');
}

function markKnown(section) {
  updateProgress(section.dataset.id, promote);
  section.classList.remove('is-hidden');
  section.classList.remove('is-known-anim');
  void section.offsetWidth;
  section.classList.add('is-known-anim');
}

function handleAction(button, section) {
  const card = cardsById.get(section.dataset.id);

  if (button.dataset.action === 'favorite') {
    const favorite = storage.toggleFavorite(card.id);
    button.setAttribute('aria-pressed', String(favorite));
    ui.toast(favorite ? 'Ajoutée à la collection' : 'Retirée de la collection', { duration: 1500 });
  }
  if (button.dataset.action === 'review') {
    updateProgress(card.id, demote);
    ui.toast('Cette carte reviendra bientôt', { duration: 1500 });
  }
  if (button.dataset.action === 'share') ui.shareCard(card);
}

function handleQuiz(button, section) {
  const card = cardsById.get(section.dataset.id);
  const correct = revealQuizAnswer(section, card, button.dataset.choice);
  storage.recordQuiz(correct);
  updateProgress(card.id, correct ? promote : demote);
}

// Tap simple = révéler, double tap = « je connais ». Le tap simple attend un court délai
// pour ne pas se déclencher lors d'un double tap.
let tapTimer = null;
let lastTap = { section: null, time: 0 };

function handleTap(section) {
  const now = performance.now();
  const isDouble = lastTap.section === section && now - lastTap.time < DOUBLE_TAP_MS;
  clearTimeout(tapTimer);

  if (isDouble) {
    lastTap = { section: null, time: 0 };
    markKnown(section);
    return;
  }

  lastTap = { section, time: now };
  tapTimer = setTimeout(() => toggleReveal(section), DOUBLE_TAP_MS);
}

feedNode.addEventListener('click', (event) => {
  const section = event.target.closest('.card');
  if (!section) return;

  const action = event.target.closest('[data-action]');
  if (action) return handleAction(action, section);

  const choice = event.target.closest('.quiz__choice');
  if (choice) return handleQuiz(choice, section);

  if (section.dataset.kind === 'card') handleTap(section);
});

document.addEventListener('keydown', (event) => {
  if (document.querySelector('dialog[open]') || event.target.closest('button, input')) return;

  if (['ArrowDown', 'PageDown', 'j'].includes(event.key)) {
    event.preventDefault();
    feed.step(1);
  }
  if (['ArrowUp', 'PageUp', 'k'].includes(event.key)) {
    event.preventDefault();
    feed.step(-1);
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    toggleReveal(feed.active);
  }
});

function setupHeader() {
  document.getElementById('filters-button').addEventListener('click', () => ui.openDialog('filters'));

  document.getElementById('collection-button').addEventListener('click', () => {
    const progress = storage.allProgress();
    ui.renderCollection({
      favorites: storage.getFavorites().map((id) => cardsById.get(id)).filter(Boolean),
      known: allCards.filter((card) => progress[card.id]?.status === 'known'),
      total: allCards.length,
    });
  });

  document.getElementById('stats-button').addEventListener('click', () => {
    ui.renderStats({
      seen: storage.totalViews(),
      unique: Object.values(storage.allProgress()).filter((progress) => progress.seen > 0).length,
      total: allCards.length,
      quiz: storage.getQuizStats(),
      streak: storage.getStreak(),
    });
  });
}

// Service worker : dès qu'une nouvelle version prend la main, la page se recharge seule.
// Pas de rechargement à la toute première visite (aucune version précédente).
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    storage.flush();
    window.location.reload();
  });

  const registration = await navigator.serviceWorker.register('sw.js');

  // Une PWA installée reste souvent ouverte : on vérifie les mises à jour à chaque retour au premier plan.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') registration.update().catch(() => {});
  });
}

async function start() {
  ui.injectIcons();
  ui.setupDialogs();
  ui.updateStreak(storage.getStreak());
  setupHeader();
  maybeHintIos = ui.setupInstall({
    shouldHintIos: () => !storage.getFlag('iosHintShown'),
    onIosHintShown: () => storage.setFlag('iosHintShown'),
  });
  window.addEventListener('pagehide', storage.flush);

  try {
    allCards = await getCards();
    cardsById = new Map(allCards.map((card) => [card.id, card]));
    ui.renderFilters(allCards, storage.getSettings(), (settings) => {
      storage.saveSettings(settings);
      reloadFeed();
    });
    reloadFeed();
  } catch (error) {
    feedNode.innerHTML = '<section class="card card--summary"><div class="card__body"><p class="summary__count">Impossible de charger les cartes.</p><p class="card__meta">Vérifiez votre connexion puis rechargez la page.</p></div></section>';
    console.warn(error);
  }

  registerServiceWorker().catch((error) => console.warn('Service worker non enregistré', error));
}

start();
