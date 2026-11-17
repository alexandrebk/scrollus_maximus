// Feed vertical : composition des lots de cartes (SRS) et rendu en fenêtre glissante.

import { renderItem } from './cards.js';
import { isDue, newProgress } from './srs.js';
import { getProgress } from './storage.js';

const BATCH_SIZE = 8;
const DUE_SHARE = 0.3;
const KNOWN_CHANCE = 0.2;
const SUMMARY_EVERY = 20;
const MAX_RENDERED = 48;
const TRIM_COUNT = 16;
const PREFETCH_DISTANCE = 3;

const progressOf = (card) => getProgress(card.id) || newProgress();

export class Feed {
  constructor(container, { ctx, onActive }) {
    this.container = container;
    this.ctx = ctx;
    this.onActive = onActive;
    this.cards = [];
    this.activeObserver = new IntersectionObserver((entries) => this.handleActive(entries), {
      root: container,
      threshold: 0.6,
    });
    this.prefetchObserver = new IntersectionObserver((entries) => this.handlePrefetch(entries), {
      root: container,
    });
  }

  load(cards) {
    this.cards = cards;
    this.lastId = null;
    this.untilSummary = SUMMARY_EVERY;
    this.activeObserver.disconnect();
    this.prefetchObserver.disconnect();
    this.container.replaceChildren();
    this.container.scrollTop = 0;
    this.appendBatch();
  }

  // Cartes dues (~30 %), puis nouvelles, puis de temps en temps une carte déjà connue.
  composeBatch() {
    const now = Date.now();
    const pool = this.cards;
    const due = pool.filter((card) => isDue(progressOf(card), now)).sort((a, b) => progressOf(a).dueAt - progressOf(b).dueAt);
    const fresh = pool.filter((card) => progressOf(card).status === 'new');
    const known = pool.filter((card) => progressOf(card).status === 'known' && !isDue(progressOf(card), now));

    const picked = new Set();
    const take = (list, count) => {
      list.filter((card) => !picked.has(card)).slice(0, count).forEach((card) => picked.add(card));
    };

    take(due, Math.ceil(BATCH_SIZE * DUE_SHARE));
    take([...fresh].sort(() => Math.random() - 0.5), BATCH_SIZE - picked.size);
    if (Math.random() < KNOWN_CHANCE) take([...known].sort(() => Math.random() - 0.5), 1);
    take([...pool].sort(() => Math.random() - 0.5), BATCH_SIZE - picked.size);

    return [...picked].sort(() => Math.random() - 0.5);
  }

  nextItems() {
    if (!this.cards.length) return [{ kind: 'empty' }];

    const items = [];
    const push = (item) => {
      items.push(item);
      if (item.card) this.lastId = item.card.id;
    };

    for (const card of this.composeBatch()) {
      if (card.id === this.lastId) continue;
      push({ kind: 'card', card });

      this.untilSummary -= 1;
      if (this.untilSummary <= 0) this.pushSummary(items);
    }

    // Filtre très restrictif (une seule carte) : un bilan s'intercale pour éviter un doublon consécutif.
    if (!items.length) this.pushSummary(items);
    return items;
  }

  pushSummary(items) {
    items.push({ kind: 'summary' });
    this.untilSummary = SUMMARY_EVERY;
    this.lastId = null;
  }

  appendBatch() {
    const items = this.nextItems();
    const nodes = items.map((item) => {
      const node = renderItem(item, this.ctx);
      node.feedItem = item;
      this.activeObserver.observe(node);
      return node;
    });
    this.container.append(...nodes);

    if (items[0]?.kind !== 'empty') {
      this.prefetchObserver.observe(nodes[Math.max(0, nodes.length - PREFETCH_DISTANCE)]);
    }
    this.trim();
  }

  // Fenêtre glissante : on retire les cartes loin au-dessus en compensant le scroll.
  trim() {
    const children = [...this.container.children];
    if (children.length <= MAX_RENDERED) return;

    const removed = children.slice(0, TRIM_COUNT);
    const height = removed.reduce((sum, node) => sum + node.offsetHeight, 0);
    removed.forEach((node) => {
      this.activeObserver.unobserve(node);
      node.remove();
    });
    this.container.scrollTop -= height;
  }

  handlePrefetch(entries) {
    entries
      .filter((entry) => entry.isIntersecting)
      .forEach((entry) => {
        this.prefetchObserver.unobserve(entry.target);
        this.appendBatch();
      });
  }

  handleActive(entries) {
    entries
      .filter((entry) => entry.isIntersecting)
      .forEach((entry) => {
        this.active = entry.target;
        if (entry.target.dataset.viewed) return;
        entry.target.dataset.viewed = 'true';
        this.onActive(entry.target.feedItem, entry.target);
      });
  }

  step(direction) {
    this.container.scrollBy({ top: direction * this.container.clientHeight, behavior: 'smooth' });
  }
}
