// Couche d'accès aux cartes. En V2, getCards() pourra interroger Supabase
// au lieu de data/cards.json sans toucher au reste de l'app.

const CARDS_URL = 'data/cards.json';
const REQUIRED_FIELDS = ['id', 'type', 'text', 'theme', 'published'];

const isValid = (card) => REQUIRED_FIELDS.every((field) => card[field] !== undefined);

export async function getCards() {
  const response = await fetch(CARDS_URL);
  if (!response.ok) throw new Error(`Impossible de charger les cartes (${response.status})`);

  const cards = await response.json();
  return cards.filter((card) => isValid(card) && card.published);
}
