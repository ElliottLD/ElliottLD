# Embruns

L'assistant marketing des commerces de quartier : il transforme les ventes de caisse en clients connus, en KPI clairs et en actions prêtes à lancer en un clic.

Démo sur une boulangerie fictive, « Au Pain Doré ». Spécification complète : [`CAHIER_DES_CHARGES.md`](./CAHIER_DES_CHARGES.md). Avancement : [`PROGRESS.md`](./PROGRESS.md).

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · Supabase (Postgres UE, Auth par lien magique, RLS) · Vitest · Vercel.

## Démarrer en local

```bash
cp .env.example .env.local   # puis renseigner l'URL et les clés Supabase
npm install
npm run dev
```

Appliquer le schéma sur le projet Supabase :

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

## Tests

Les tests de base de données créent une base jetable sur un Postgres local, y rejouent un stub de l'environnement Supabase (`supabase/tests/supabase-stub.sql`) puis toutes les migrations, et vérifient l'isolation RLS entre deux commerçants.

```bash
export TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
npm test
```
