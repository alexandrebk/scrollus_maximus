// Rendu DOM de chaque élément du feed : carte de contenu, bilan de session, état vide.

import { icons } from './icons.js';

export const TYPE_LABELS = {
  latin: 'Latin',
  literary: 'Littérature',
  culture: 'Culture',
  image: 'Image',
};

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function shell(item, modifier) {
  const section = el('section', `card card--${modifier}`);
  section.dataset.theme = item.card?.theme || '';
  section.dataset.id = item.card?.id || '';
  section.dataset.kind = item.kind;
  section.setAttribute('aria-roledescription', 'carte');
  return section;
}

function background(card) {
  const bg = el('div', 'card__bg');
  if (!card.image) return bg;

  const img = el('img', 'card__img');
  img.src = card.image;
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  bg.append(img);
  return bg;
}

function meta(card) {
  const parts = [card.author, card.work].filter(Boolean);
  return parts.length ? el('p', 'card__meta', parts.join(' · ')) : null;
}

function actionButton(action, label, icon, pressed) {
  const button = el('button', `card__action card__action--${action}`);
  button.type = 'button';
  button.dataset.action = action;
  button.setAttribute('aria-label', label);
  if (pressed !== undefined) button.setAttribute('aria-pressed', String(pressed));
  button.innerHTML = icon;
  return button;
}

function actions(card, ctx) {
  const bar = el('div', 'card__actions');
  bar.append(
    actionButton('known', 'Je connais', icons.known, ctx.isKnown(card.id)),
    actionButton('favorite', 'Ajouter aux favoris', icons.heart, ctx.isFavorite(card.id)),
    actionButton('review', 'À revoir', icons.review),
    actionButton('share', 'Partager', icons.share),
  );
  return bar;
}

function contentCard(item, ctx) {
  const { card } = item;
  const section = shell(item, card.type);
  const body = el('div', 'card__body');
  const textClass = card.type === 'latin' ? 'card__text card__text--latin' : 'card__text';

  body.append(el('p', 'card__type', TYPE_LABELS[card.type] || card.type), el('blockquote', textClass, card.text));

  const details = el('div', 'card__details');
  if (card.translation) details.append(el('p', 'card__translation', card.translation));
  const metaNode = meta(card);
  if (metaNode) details.append(metaNode);
  if (card.anecdote) details.append(el('p', 'card__anecdote', card.anecdote));

  const related = card.related && ctx.getCard(card.related);
  if (related) details.append(el('p', 'card__related', `Voir aussi : « ${related.text} »`));

  body.append(details);

  if (card.image_credit) body.append(el('p', 'card__credit', card.image_credit));

  section.append(background(card), body, actions(card, ctx), el('div', 'card__known', 'Je connais'));
  return section;
}

function summaryCard(item, ctx) {
  const section = shell(item, 'summary');
  const body = el('div', 'card__body');
  const { current } = ctx.getStreak();
  body.append(
    el('p', 'card__type', 'Bilan'),
    el('p', 'summary__count', `Tu as vu ${ctx.viewsToday()} cartes aujourd'hui`),
    el('p', 'card__meta', current > 0 ? `Série en cours : ${current} jour${current > 1 ? 's' : ''}` : 'Vois 5 cartes par jour pour lancer ta série.'),
    el('p', 'card__hint', 'Continue à scroller pour reprendre'),
  );
  section.append(el('div', 'card__bg'), body);
  return section;
}

function emptyCard(item) {
  const section = shell(item, 'summary');
  const body = el('div', 'card__body');
  body.append(
    el('p', 'summary__count', 'Aucune carte ne correspond'),
    el('p', 'card__meta', 'Élargis les filtres pour retrouver le feed.'),
  );
  section.append(el('div', 'card__bg'), body);
  return section;
}

const renderers = { card: contentCard, summary: summaryCard, empty: emptyCard };

export const renderItem = (item, ctx) => renderers[item.kind](item, ctx);
