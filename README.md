# Scrollus

PWA mobile-first pour apprendre le latin en scrollant verticalement des citations latines, carte par carte, comme sur TikTok ou Instagram.

- Vanilla JavaScript (modules ES), HTML, CSS : aucun framework, aucun build.
- Données dans `data/cards.json`, progression dans le `localStorage` du navigateur, aucun compte.
- Installable et utilisable hors ligne après la première visite.
- Déployée sur GitHub Pages via GitHub Actions.

## Lancer en local

Le service worker et les modules ES exigent un serveur HTTP (pas d'ouverture en `file://`).

```bash
python3 -m http.server 8000
# ou
npx serve .
```

Puis ouvrir http://localhost:8000.

> En développement, le service worker met l'app en cache. Pour voir vos modifications : DevTools → Application → Service workers → « Update on reload », ou incrémentez `VERSION` dans `sw.js`.

## Utilisation

| Geste | Effet |
| --- | --- |
| Swipe vertical / flèches ↑ ↓ | Carte suivante ou précédente |
| Bouton ✓ | « Je connais » : la carte monte d'un niveau |
| Bouton ↻ | « À revoir » : la carte revient vite |
| Bouton cœur | Ajoute aux favoris (écran Collection) |

## Structure

| Chemin | Rôle |
| --- | --- |
| `index.html` | Page unique, en-tête et feuilles modales |
| `css/style.css` | Styles, thèmes de cartes, animations |
| `js/app.js` | Point d'entrée, interactions, service worker |
| `js/feed.js` | Composition du feed (SRS) et fenêtre glissante |
| `js/cards.js` | Rendu de chaque type de carte |
| `js/srs.js` | Répétition espacée (boîtes de Leitner 1, 3, 7, 21, 60 jours) |
| `js/storage.js` | Progression, favoris, série, réglages |
| `js/data-source.js` | Accès aux cartes (`getCards()`) |
| `js/ui.js` | Toasts, filtres, collection, installation |
| `sw.js` | Cache hors ligne |
| `admin/config.yml` | Exemple Decap CMS pour la V2 (inactif) |

## Schéma d'une carte

```json
{
  "id": "lat-001",
  "type": "latin",
  "text": "Si vis pacem, para bellum",
  "translation": "Si tu veux la paix, prépare la guerre",
  "author": "Végèce",
  "work": "Epitoma rei militaris",
  "theme": "guerre",
  "anecdote": "…",
  "image": "images/lat-001.webp",
  "image_credit": "Wikimedia Commons, domaine public",
  "related": "lat-010",
  "difficulty": 2,
  "published": true
}
```

| Champ | Obligatoire | Description |
| --- | --- | --- |
| `id` | oui | Unique, au format `lat-001` |
| `type` | oui | Toujours `latin` |
| `text` | oui | Texte principal (`\n` pour un retour à la ligne) |
| `theme` | oui | `guerre`, `sagesse`, `amour`, `humour`, `philosophie`, `droit`, `vie quotidienne`, `honneur`, `histoire`, `religion`, `mort`, `nature`, `savoir`, `politique` |
| `published` | oui | `false` masque la carte |
| `translation` | non | Traduction ou sous-titre |
| `author`, `work` | non | Attribution ; écrire « attribué à » ou « tradition » en cas de doute |
| `anecdote` | non | 3 lignes maximum |
| `image`, `image_credit` | non | Chemin relatif et crédit de l'image |
| `related` | non | `id` d'une carte liée (affichée en « Voir aussi ») |
| `difficulty` | non | 1 à 3 |

## Ajouter une carte

1. Ajouter un objet dans `data/cards.json` en respectant le schéma ci-dessus.
2. Si besoin, déposer l'image dans `images/` (WebP, ~900 px de large) et l'ajouter à la liste `SHELL` de `sw.js` pour qu'elle soit disponible hors ligne.
3. Pousser sur `main` : le déploiement est automatique. `cards.json` étant servi en stale-while-revalidate, les utilisateurs voient la nouvelle carte au chargement suivant.

### Remplacer les images provisoires

Les fichiers de `images/` sont des illustrations provisoires générées. Pour les remplacer :

1. Chercher une image du domaine public sur [Wikimedia Commons](https://commons.wikimedia.org) et vérifier sa licence.
2. La convertir en WebP sous le même nom (`cwebp -q 78 source.jpg -o images/lat-002.webp`).
3. Mettre à jour `image_credit` (auteur, source, licence) et incrémenter `VERSION` dans `sw.js`.

## Déploiement sur GitHub Pages

1. Pousser le dépôt sur GitHub, branche `main`.
2. Dans *Settings → Pages → Build and deployment → Source*, choisir **GitHub Actions**.
3. Chaque push sur `main` lance `.github/workflows/deploy.yml` et publie le site sur `https://<utilisateur>.github.io/<nom-du-repo>/`.

Tous les chemins sont relatifs : l'app fonctionne sous n'importe quel sous-dossier. Après une modification de l'app shell (HTML, CSS, JS, polices), incrémenter `VERSION` dans `sw.js` : la page des utilisateurs se met à jour et se recharge automatiquement.

## Installer sur téléphone

| Plateforme | Étapes |
| --- | --- |
| Android (Chrome) | Bouton d'installation dans l'en-tête, ou menu ⋮ → « Installer l'application » |
| iPhone (Safari) | Bouton Partager → « Sur l'écran d'accueil » (une invitation s'affiche après quelques cartes) |
| Desktop (Chrome, Edge) | Icône d'installation dans la barre d'adresse |

## Feuille de route V2 : back office

La V1 est prête pour les deux options : l'accès aux cartes passe par `js/data-source.js` (`getCards()`) et la progression par `js/storage.js`.

| | Option A : Decap CMS | Option B : Supabase |
| --- | --- | --- |
| Principe | Interface `/admin/` qui commite dans le dépôt | Base Postgres (table `cards`) + Storage pour les images |
| Hébergement | Reste 100 % statique | Front statique, données via l'API Supabase |
| Authentification | Proxy OAuth GitHub à héberger (Cloudflare Worker, Netlify…) | Intégrée (e-mail, OAuth) |
| Comptes utilisateurs | Non | Oui : synchro de la progression entre appareils |
| Historique | Versionné par Git, relecture possible par PR | À gérer côté base |
| Coût | Gratuit | Gratuit jusqu'à un certain volume |
| Changements en V1 | Une carte par fichier dans `data/cards/` + étape Actions qui fusionne en `cards.json` | Réécrire `getCards()` et `storage.js` |
| Limites | Pas de données utilisateurs, publication = déploiement | Dépendance à un service tiers, hors ligne à gérer (cache) |

`admin/config.yml` contient un exemple de configuration Decap qui reflète exactement le schéma des cartes.
