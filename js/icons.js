// Icônes SVG inline (aucune requête réseau, compatibles hors ligne).

const svg = (path) =>
  `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

export const icons = {
  heart: svg('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  known: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  review: svg('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>'),
  filter: svg('<path d="M4 5h16"/><path d="M7 12h10"/><path d="M10 19h4"/>'),
  collection: svg('<path d="M5 4h10a2 2 0 0 1 2 2v14l-7-4-7 4V6a2 2 0 0 1 2-2z"/>'),
  install: svg('<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>'),
  close: svg('<path d="M6 6l12 12"/><path d="M18 6L6 18"/>'),
  flame: svg('<path d="M12 21c4 0 7-2.7 7-6.5 0-3.5-2.5-5.5-4-8.5-1 2-2 3-3.5 3.5C11 7 11 5 12 3 8 5 5 9 5 14.5 5 18.3 8 21 12 21z"/>'),
};
