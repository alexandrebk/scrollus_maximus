// Interface hors feed : toasts, en-tête, filtres, collection, installation.

import { TYPE_LABELS } from './cards.js';
import { icons } from './icons.js';

const $ = (selector) => document.querySelector(selector);

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

export function injectIcons() {
  document.querySelectorAll('[data-icon]').forEach((node) => {
    node.insertAdjacentHTML('afterbegin', icons[node.dataset.icon]);
  });
}

export function toast(message, { actionLabel, onAction, duration = 3000 } = {}) {
  const node = el('div', 'toast');
  node.setAttribute('role', 'status');
  node.append(el('span', '', message));

  const close = () => {
    node.classList.remove('is-visible');
    setTimeout(() => node.remove(), 300);
  };

  if (actionLabel) {
    const button = el('button', 'toast__action', actionLabel);
    button.type = 'button';
    button.addEventListener('click', () => {
      onAction();
      close();
    });
    node.append(button);
  }

  $('#toasts').append(node);
  requestAnimationFrame(() => node.classList.add('is-visible'));
  if (duration) setTimeout(close, duration);
}

export function updateStreak({ current }) {
  $('#streak-count').textContent = current;
  $('#streak').setAttribute('aria-label', `Série de ${current} jour${current > 1 ? 's' : ''}`);
}

export function setupDialogs() {
  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  });
}

export const openDialog = (id) => document.getElementById(id).showModal();

function chip(group, value, label, checked) {
  const wrapper = el('label', 'chip');
  const input = el('input');
  input.type = 'checkbox';
  input.name = group;
  input.value = value;
  input.checked = checked;
  wrapper.append(input, el('span', '', label));
  return wrapper;
}

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

export function renderFilters(cards, settings, onChange) {
  const themes = [...new Set(cards.map((card) => card.theme))].sort((a, b) => a.localeCompare(b, 'fr'));
  const types = [...new Set(cards.map((card) => card.type))];

  $('#filter-themes').replaceChildren(...themes.map((theme) => chip('themes', theme, capitalize(theme), settings.themes.includes(theme))));
  $('#filter-types').replaceChildren(...types.map((type) => chip('types', type, TYPE_LABELS[type] || type, settings.types.includes(type))));

  const form = $('#filters-form');
  form.onchange = () => {
    const values = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
    onChange({ themes: values('themes'), types: values('types') });
  };
  form.onreset = () => setTimeout(() => form.onchange());
}

function collectionList(cards, emptyText) {
  if (!cards.length) return el('p', 'sheet__empty', emptyText);

  const list = el('ul', 'collection__list');
  cards.forEach((card) => {
    const item = el('li', 'collection__item');
    item.append(el('p', 'collection__text', card.text));
    if (card.translation) item.append(el('p', 'collection__translation', card.translation));
    list.append(item);
  });
  return list;
}

export function renderCollection({ favorites, known, total }) {
  $('#collection-count').textContent = `${known.length} / ${total} cartes maîtrisées`;
  $('#collection-favorites').replaceChildren(collectionList(favorites, 'Touchez le cœur sur une carte pour la garder ici.'));
  $('#collection-known').replaceChildren(collectionList(known, 'Appuyez sur ✓ sur une carte que vous connaissez.'));
  openDialog('collection');
}

// Invitation discrète à installer l'app (Android/desktop via beforeinstallprompt, iOS via instruction).
export function setupInstall({ shouldHintIos, onIosHintShown }) {
  let deferred = null;
  const button = $('#install-button');

  const isMobile = window.matchMedia('(pointer: coarse)').matches;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
    button.hidden = !isMobile;
  });

  button.addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    button.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    button.hidden = true;
  });

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

  return () => {
    if (!isIos || standalone || !shouldHintIos()) return;
    onIosHintShown();
    toast('Pour installer Scrollus : bouton Partager, puis « Sur l\'écran d\'accueil ».', { duration: 8000 });
  };
}
