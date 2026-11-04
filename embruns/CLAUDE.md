# Embruns — consignes pour Claude Code

@AGENTS.md

**Source de vérité : [`CAHIER_DES_CHARGES.md`](./CAHIER_DES_CHARGES.md).** Le lire en entier avant toute étape.
L'avancement, les décisions et les points ouverts sont dans [`PROGRESS.md`](./PROGRESS.md) : le tenir à jour à chaque commit significatif.

## Règles (section 12 du cahier des charges)

1. Pour chaque étape de la section 10 : plan court, puis exécution. Ordre strict ; on ne passe à l'étape suivante que critères cochés et tests verts.
2. Rien hors périmètre (section 2) sans demande explicite.
3. KPI, segments et détecteurs en SQL ou TypeScript pur, testés. L'IA ne calcule jamais un chiffre (section 5).
4. Vérifier la documentation officielle actuelle avant d'implémenter une API externe (SumUp, Resend, Anthropic, Supabase). Signaler les écarts.
5. Aucun secret dans le code : variables d'environnement, `.env.example` à jour.
6. Interface en français ; code, tables et variables en anglais.
7. Petits commits explicites, un par fonctionnalité.
8. Mobile d'abord pour les pages client et le Scanner ; états vides et de chargement soignés.
9. Doute sur une règle métier : poser la question plutôt qu'inventer.

## Repères techniques

- Next.js 16 (App Router, `src/`), le middleware s'appelle `src/proxy.ts`. Cache Components désactivé.
- Supabase via `@supabase/ssr` : `src/lib/supabase/server.ts` (session, RLS), `admin.ts` (secret, serveur uniquement), `proxy.ts` (rafraîchit la session, protège l'espace commerçant).
- Identité vérifiée avec `auth.getClaims()`, jamais `getSession()` pour une décision d'accès.
- Schéma : `supabase/migrations/`. Toute nouvelle table porte `merchant_id`, une politique RLS via `private.owns_merchant()`, et des clés étrangères composites `(merchant_id, id)`. L'ajouter à la liste `TABLES` de `tests/db/rls.test.ts` (le test échoue sinon).
- Pages publiques (inscription, carte) : aucune politique `anon`, passage par le serveur avec limitation de débit.

## Commandes

```bash
npm run dev          # http://localhost:3000
npm run lint && npm run typecheck
npm test             # unitaires + RLS (Postgres requis : TEST_DATABASE_URL)
npm run build
```
