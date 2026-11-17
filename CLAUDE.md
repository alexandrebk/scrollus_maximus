# Scrollus Maximus

## Service worker : publier une nouvelle version à chaque changement

- À chaque modification d'un fichier de l'app (HTML, CSS, JS, polices, icônes, images, `manifest.webmanifest`), incrémenter `VERSION` dans `sw.js` (`'v1'` → `'v2'`…) dans le même changement.
- Sans ça, les utilisateurs qui ont déjà ouvert l'app gardent l'ancienne version en cache : le service worker sert l'app shell en cache-first.
- Avec une nouvelle `VERSION`, la mise à jour est automatique côté client : le nouveau service worker s'active tout de suite (`skipWaiting`) et la page se recharge seule (`controllerchange` dans `js/app.js`).
- Seul `data/cards.json` se met à jour sans changer de version (stale-while-revalidate).
- Toute nouvelle image ajoutée dans `images/` doit aussi être ajoutée à la liste `SHELL` de `sw.js` pour être disponible hors ligne.
