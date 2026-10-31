# GMAT Quant — zéro lacune avant janvier

Site personnel de remise à niveau GMAT Focus Quant.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # validation des questions + logique
npm run build      # tests puis build : le build échoue si une question est fausse
```

Déploiement Vercel : importer le dépôt et régler **Root Directory = `gmat-quant`** (Next.js est détecté). `npm run build` lance les tests avant le build.

## Organisation

- `content/program.ts` : blocs, chapitres et notions (section 5 de la spec).
- `content/chapters/<ID>/course.ts` et `questions.ts` : cours et 15 questions par chapitre. Chaque chapitre livré s'enregistre dans `content/index.ts`.
- `content/calendar.ts`, `content/glossary.ts`.
- `lib/storage.ts` : progression dans `localStorage` (+ export/import JSON).
- `lib/progress.ts` : maîtrise des chapitres, validation des notions.
- `lib/ds.ts` : choix Data Sufficiency et vérification par force brute.
- `tests/` : Vitest.

## Écrire une question

Le contenu est en TypeScript (et non en JSON) pour que chaque question porte sa fonction `verify()`.

- Textes en Markdown + LaTeX (`$…$`), écrits avec ``md`…` `` (= `String.raw`). Un dollar littéral s'écrit `\$`.
- `choiceValues` : la valeur machine de chaque choix. Le test vérifie que `verify()` donne la bonne réponse **et aucun autre choix**.
- `match: "closest"` pour les questions « which is closest to ».
- DS : `choices: DS_CHOICES`, `choiceValues: [...DS_LETTERS]`, et `verify` via `dsAnswer({ cases, s1, s2, ask })`.
- Questions non vérifiables par code : `verifiedBy: "manual"` (listées dans le rapport de bloc).
