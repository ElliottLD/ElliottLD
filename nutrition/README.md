# Assiette — suivi nutrition par photo

Petite appli web (installable sur l'écran d'accueil) : on photographie un repas, Claude estime les aliments, les calories et les macros, et l'appli suit la journée par rapport à l'objectif calculé à partir du profil.

- **Pas de compte** : chaque personne remplit son profil à la première ouverture. Tout est stocké dans le navigateur du téléphone (`localStorage`), rien dans une base partagée.
- **Photos jamais conservées** : la photo est réduite sur le téléphone, envoyée à `/api/analyze`, analysée, puis oubliée. Seul le résultat est gardé.
- **Lien secret** : l'API n'accepte que les requêtes portant la clé `APP_ACCESS_KEY`, transmise par le lien `https://…/?k=<clé>`. Limite indicative de `DAILY_LIMIT` analyses par jour et par adresse IP.
- Export / import d'une sauvegarde JSON depuis l'onglet Profil.

## Structure

```
api/analyze.js        fonction Vercel : appel à Claude (vision + sortie JSON structurée)
public/index.html     page unique
public/app.js         toute la logique (profil, objectifs, repas, poids, historique)
public/styles.css     styles (clair / sombre)
public/sw.js          cache hors ligne de l'interface
```

## Variables d'environnement (Vercel)

| Nom | Rôle |
|---|---|
| `ANTHROPIC_API_KEY` | clé API Anthropic (console.anthropic.com) |
| `APP_ACCESS_KEY` | clé du lien secret |
| `CLAUDE_MODEL` | facultatif, par défaut `claude-opus-5-5` (`claude-haiku-5-5` pour réduire le coût) |
| `DAILY_LIMIT` | facultatif, analyses par jour et par IP (40 par défaut) |

## Calcul des objectifs

Métabolisme de base Mifflin-St Jeor × niveau d'activité. En sèche : déficit selon le rythme choisi (7700 kcal par kg, plafonné à 25 % de la dépense), protéines à 2 g par kg de poids visé, lipides ≥ 25 % des calories, le reste en glucides. Chaque nouvelle pesée recalcule les objectifs. Ils peuvent aussi être fixés à la main.

## Règles pour les mises à jour

Les personnes qui utilisent l'appli ne doivent jamais avoir à la supprimer, la réinstaller ou perdre des données après une mise à jour. Toute modification respecte ces règles :

1. **Changer `CACHE` dans `public/sw.js` à chaque mise en ligne** (`assiette-v11` → `assiette-v12`…). C'est ce qui déclenche la mise à jour automatique : quand l'appli revient au premier plan, elle détecte le nouveau service worker et se recharge toute seule (jamais pendant la saisie d'un repas ou d'une recette).
2. **Rester compatible avec les données déjà stockées** (`localStorage` : `as_profile`, `as_meals`, `as_weights`, `as_recipes`) et avec les anciennes sauvegardes. Un nouveau champ a toujours une valeur par défaut quand il manque ; on ne renomme ni ne supprime une clé ou un champ existant sans code de migration.
3. **Ne pas changer sans prévenir les utilisateurs**, car cela demande une action de leur part :
   - l'adresse du site (les données sont liées à l'adresse : il faudrait exporter puis importer) ;
   - la variable `APP_ACCESS_KEY` (il faudrait réinstaller l'appli avec le nouveau lien) ;
   - l'icône ou le nom affiché sur l'écran d'accueil (iOS ne met pas à jour une icône déjà installée ; l'appli continue de fonctionner, seule l'ancienne icône reste).
4. **Garder l'import des anciennes sauvegardes** : `readBackup()` accepte toutes les versions précédentes (`version` 1 sans recettes, `version` 2…) et vérifie le fichier avant de remplacer quoi que ce soit.
