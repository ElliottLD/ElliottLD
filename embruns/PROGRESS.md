# Avancement — Embruns

Mis à jour le 4 novembre 2026.

## Étape en cours : 1 — Données de démo, KPI et Accueil

Plan à valider (voir fin de fichier).

## Étape 0 — Socle (terminée le 4/11/2026)

### Plan

1. Projet Next.js 16 (TypeScript, Tailwind 4) dans `embruns/`, cahier des charges et `CLAUDE.md` à la racine du projet.
2. Schéma complet de la section 6.1 en une migration Supabase, RLS sur toutes les tables, clés composites pour empêcher tout lien entre commerces.
3. Tests d'isolation RLS sur un Postgres jetable (stub Supabase), en local et en CI.
4. Connexion par lien magique (`@supabase/ssr`, proxy Next.js, `getClaims`), création du commerce au premier passage.
5. Squelette de navigation : 8 écrans vides avec état vide, identité visuelle marine.
6. Déploiement Vercel et projet Supabase `embruns` (Paris) : faits.

### Critères

- [x] Projet Next.js (TypeScript) déployé sur Vercel, projet Supabase en région UE, connexion commerçant par lien magique
  - [x] Projet Next.js, build de production vert
  - [x] Connexion par lien magique codée (`/connexion`, `/auth/confirm`, `/auth/deconnexion`), espace commerçant protégé par le proxy
  - [x] Projet Supabase `embruns` créé en `eu-west-3` (Paris, plan gratuit), migration appliquée (16 tables, RLS partout, conseiller sécurité : aucune alerte), variables branchées sur Vercel
  - [x] URL du site et URL de redirection configurées dans Supabase Auth
  - [x] Déployé sur Vercel : projet `embruns` (équipe VIE RADAR), racine `embruns/`, fonctions à Paris (`cdg1`), https://embruns.vercel.app
  - [x] Connexion testée de bout en bout avec un vrai email : lien magique, création du commerce, arrivée sur l'Accueil (4/11/2026)
- [x] Schéma complet de la section 6 en migrations, RLS active sur toutes les tables, tests d'isolation entre deux commerçants (65 tests verts ; un test de mutation a confirmé qu'une politique trop large est détectée)
- [x] Squelette de navigation (8 écrans vides), identité visuelle de base

## Décisions

| Sujet | Décision | Raison |
| --- | --- | --- |
| Emplacement | Sous-dossier `embruns/` du dépôt `ElliottLD/ElliottLD` | Seul dépôt accessible depuis cette session. À déplacer vers un dépôt dédié si souhaité (voir points ouverts). |
| Next.js | Version 16 : `src/proxy.ts` remplace le middleware ; Cache Components désactivé | Toutes les pages commerçant dépendent de la session ; Cache Components imposerait des `Suspense` partout sans gain pour un back-office. |
| Clés Supabase | Nouvelles clés `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` et `SUPABASE_SECRET_KEY` | Recommandation actuelle de la documentation Supabase (vérifiée le 4/11/2026). |
| Un commerce par compte | `merchants.owner_id` unique | Section 2 : pas de multi-établissements ni d'équipes en V1. |
| RLS | Une politique par table via `private.owns_merchant(merchant_id)` (security definer, `search_path` vide) | Une seule règle, testée sur toutes les tables. |
| Intégrité entre commerces | Clés étrangères composites `(merchant_id, id)` | Une vente ne peut pas être rattachée au client d'un autre commerce, même par bug applicatif. |
| Accès anonyme | Aucune politique `anon` ; inscription et carte passeront par le serveur (clé secrète) avec limitation de débit | Section 9 : pas de données personnelles exposées à l'API publique. |
| Jetons OAuth | Colonnes chiffrées non lisibles ni modifiables par le rôle `authenticated` (droits par colonne) | Section 9 : jetons côté serveur uniquement. |
| Lien de la carte | `loyalty_cards.public_token` : 24 octets aléatoires (48 caractères hex) | Section 9 : jeton long, jamais séquentiel. |
| Inscription QR | `merchants.signup_slug` aléatoire | Pas d'identifiant interne dans l'URL publique. |
| Écart section 6.1 | Table supplémentaire `automation_sends` (bienvenue, relances, anniversaires, demandes d'avis) | Nécessaire pour « au plus une demande d'avis tous les 90 jours » et le suivi envoi / ouverture hors campagnes. |
| Lien magique | `/auth/confirm` accepte `?code=` (gabarit par défaut) et `?token_hash=&type=` (gabarit personnalisé) | Le second fonctionne d'un appareil à l'autre ; il suffit de changer le gabarit d'email Supabase. |
| Sans Supabase | Le site public est servi et `/connexion` affiche « connexion pas encore ouverte » ; l'espace commerçant redirige vers `/connexion` | Déployer avant d'avoir la base, sans page en erreur. |
| Tests base de données | Postgres local/CI + `supabase/tests/supabase-stub.sql` (rôles, `auth.uid()`) | Pas de Docker dans l'environnement ; le stub reproduit ce dont RLS dépend. |

## Points ouverts

1. **Clé secrète Supabase** : `SUPABASE_SECRET_KEY` à ajouter sur Vercel pour le mode démo (étape 1).
2. **Déploiement** : la production vient pour l'instant de la branche `claude/new-session-600ez7` ; elle suivra `main` après fusion. Une étape de build ignorée évite de reconstruire quand seul un autre dossier du dépôt change.
3. **Emails de connexion** : le SMTP intégré de Supabase est très limité en débit ; brancher Resend comme SMTP Auth (étape 4) avant toute démo publique. Le lien magique par défaut ne fonctionne que dans le navigateur où il a été demandé.
4. **Plan gratuit Supabase** : un projet inactif 7 jours est mis en pause ; à réactiver avant une démo.
5. **Dépôt dédié** : pour la ligne CV, un dépôt `ElliottLD/embruns` serait plus lisible que ce sous-dossier.

## Plan proposé — étape 1

1. **Générateur déterministe** (`src/lib/demo/`, TypeScript pur, graine fixe, paramètres regroupés dans un seul fichier) : 12 mois de ventes relatives au jour courant, ~40 produits en 5 catégories avec saisonnalité, ~650 clients à inscription progressive, visites rattachées aux ventes, ~180 avis, 3 campagnes passées, et les scénarios injectés (mardi après-midi −18 %, ~20 réguliers à risque, flan +35 %, >10 clients à un tampon). Testé : mêmes entrées → mêmes données, et chaque scénario mesurable.
2. **Commerce de démo dédié** « Au Pain Doré » (`is_demo = true`) appartenant à un compte de démo, rempli côté serveur par insertion en masse ; bouton « Réinitialiser la démo » qui le régénère en quelques secondes. Le commerce réel d'un commerçant n'est jamais écrasé.
3. **Fonctions SQL** `kpi_summary(période)`, `sales_by_slot`, `top_products`, `customer_segments` (section 4.2 et 4.3), comparées à la période précédente de même durée, testées sur un petit jeu de données connu à la main.
4. **Écrans** : Accueil (bandeau KPI de la semaine vs la précédente) et Analyses (CA par jour, carte de chaleur jour × heure, top produits, panier moyen, part identifiée ; sélecteur 7 j / 30 j / 90 j / 12 mois) avec Recharts.
