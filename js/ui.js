// Interface hors feed : toasts, en-tête, filtres, collection, stats, installation, partage.

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

export function renderStats({ seen, unique, total, streak }) {
  const rows = [
    ['Cartes vues', seen],
    ['Cartes découvertes', `${unique} / ${total}`],
    ['Série en cours', `${streak.current} j`],
    ['Record', `${streak.best} j`],
  ];
  $('#stats-list').replaceChildren(...rows.map(([label, value]) => {
    const row = el('div', 'stats__row');
    row.append(el('dt', '', label), el('dd', '', String(value)));
    return row;
  }));
  openDialog('stats');
}

// Invitation discrète à installer l'app (Android/desktop via beforeinstallprompt, iOS via instruction).
export function setupInstall({ shouldHintIos, onIosHintShown }) {
  let deferred = null;
  const button = $('#install-button');

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
    button.hidden = false;
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

function wrapText(ctx, text, maxWidth) {
  return text.split('\n').flatMap((paragraph) => {
    const lines = [];
    let line = '';
    paragraph.split(' ').forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });
    lines.push(line);
    return lines;
  });
}

// Image de partage 1080×1350 dessinée au canvas.
async function cardImage(card) {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#2a1e15');
  gradient.addColorStop(1, '#0e0b09');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#c9a24a';
  ctx.lineWidth = 4;
  ctx.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#efe6d2';
  ctx.font = '600 84px "Cormorant Garamond", Georgia, serif';
  const lines = wrapText(ctx, card.text, 860);
  let y = canvas.height / 2 - (lines.length * 96) / 2;
  lines.forEach((line) => {
    ctx.fillText(line, canvas.width / 2, y);
    y += 96;
  });

  ctx.font = 'italic 500 48px "Cormorant Garamond", Georgia, serif';
  ctx.fillStyle = '#c9a24a';
  wrapText(ctx, card.translation || card.author || '', 860).forEach((line) => {
    y += 56;
    ctx.fillText(line, canvas.width / 2, y);
  });

  ctx.font = '500 34px system-ui, sans-serif';
  ctx.fillStyle = '#9c8f7a';
  ctx.fillText('Scrollus Maximus', canvas.width / 2, canvas.height - 100);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export async function shareCard(card) {
  const text = [card.text, card.translation, card.author].filter(Boolean).join('\n');

  try {
    if (navigator.share) {
      const blob = await cardImage(card);
      const file = blob && new File([blob], `${card.id}.png`, { type: 'image/png' });
      const data = file && navigator.canShare?.({ files: [file] }) ? { text, files: [file] } : { text, title: 'Scrollus Maximus' };
      await navigator.share(data);
      return;
    }
    await navigator.clipboard.writeText(text);
    toast('Citation copiée dans le presse-papiers');
  } catch (error) {
    if (error.name !== 'AbortError') toast('Partage impossible sur cet appareil');
  }
}
