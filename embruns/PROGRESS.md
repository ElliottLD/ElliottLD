# Avancement — Embruns

Mis à jour le 4 novembre 2026.

## Étape 2 — Clients et fidélité (commencée à la demande, avant la fin de l'étape 1)

- [ ] Page d'inscription par QR, carte de fidélité web, QR à imprimer
- [ ] Page Scanner (tampon par scan ou numéro), règle anti-abus, récompense
- [ ] Rapprochement visite ↔ vente, écran Clients avec segments et fiche client
  - [x] Écran Clients : compteurs par segment, encart « clients à risque » avec CA mensuel en jeu, recherche par prénom, pagination (fonction SQL `segment_summary`, testée)
  - [x] Fiche client : segment et sa règle, visites, dépense, panier moyen, carte de tampons, contact et consentement, dernières visites, campagnes reçues
  - [ ] Rapprochement visite ↔ vente (fenêtre ± 5 min)

## Étape en cours : 1 — Données de démo, KPI et Accueil

### Critères

- [x] Script de génération déterministe d'« Au Pain Doré », relatif à la date du jour, bouton de réinitialisation
  - Générateur SQL `public.generate_demo` (paramètres uniquement dans `src/lib/demo/params.ts`), 17 tests : volumes, saisonnalité, part identifiée 5 % → 35 %, scénarios (mardi après-midi −18 %, ~25 réguliers à risque, flan +35 %, >10 clients à un tampon), déterminisme
  - Accès « Explorer la démo » sur `/connexion` (compte de démo partagé, régénération au premier passage du jour), bandeau « Mode démo » et bouton « Réinitialiser la démo »
- [x] Fonctions SQL des KPI et segments, avec tests unitaires sur un petit jeu de données connu (14 tests calculés à la main)
- [x] Écrans Accueil (bandeau KPI vs période précédente) et Analyses (graphique du CA, carte de chaleur, top produits, sélecteur 7 j / 30 j / 90 j / 12 mois)
- [x] Vérifié en production : démo générée sur Supabase (650 clients, 89 639 ventes), accès « Explorer la démo » testé par Elliott

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
| Générateur de démo | En SQL (une seule requête RPC) plutôt qu'en TypeScript | Envoyer ~90 000 ventes et ~190 000 lignes depuis Vercel prendrait des dizaines de Mo à chaque réinitialisation. Hasard = hachage (graine, clé) : déterministe quel que soit l'ordre d'exécution. |
| Durée de régénération | ≈ 20 s sur le plan gratuit Supabase (11 s en local), au lieu de « quelques secondes » | Écart assumé : 12 mois × ~300 tickets/jour. Délai du rôle `service_role` porté à 60 s (les rôles anon et authenticated gardent 3 s et 8 s). |
| Fonction `private.rnd` sans `search_path` | Avertissement du conseiller Supabase accepté | Une clause SET empêche l'intégration (inlining) de la fonction et rend la génération des dizaines de fois plus lente. Corps limité à `pg_catalog`, schéma privé, exécution réservée à `service_role`. |
| Accès démo | `POST /demo` : lien magique généré côté serveur (aucun email), compte `demo@example.com` | Démo accessible sans inscription (anticipe l'étape 8). |
| Périodes | Jours complets jusqu'à hier, dans le fuseau du commerce ; comparaison avec la période précédente de même durée | « Ce que voit la boulangère lundi matin » = la semaine écoulée. |
| Segments | Un seul segment par client, priorité perdu > à risque > VIP > régulier > nouveau > **occasionnel** | Les 5 règles se chevauchent ; « occasionnel » regroupe les clients qui n'entrent dans aucune. À confirmer. |
| VIP | Top 10 % des clients ayant dépensé sur 90 jours (au moins un) | Lecture de « top 10 % de la dépense ». |
| Taux de retour à 30 j | Inscrits de la période revenus dans les 30 jours suivant l'inscription | Sur une période récente, les 30 jours ne sont pas encore écoulés : le taux est provisoire. |
| Tests base de données | Postgres local/CI + `supabase/tests/supabase-stub.sql` (rôles, `auth.uid()`) | Pas de Docker dans l'environnement ; le stub reproduit ce dont RLS dépend. |

## Points ouverts

1. **Clé secrète Supabase** : ajoutée sur Vercel (Production et Preview), type Secret.
2. **Déploiement** : la production vient pour l'instant de la branche `claude/new-session-600ez7` ; elle suivra `main` après fusion. Une étape de build ignorée évite de reconstruire quand seul un autre dossier du dépôt change.
3. **Emails de connexion** : le SMTP intégré de Supabase est très limité en débit ; brancher Resend comme SMTP Auth (étape 4) avant toute démo publique. Le lien magique par défaut ne fonctionne que dans le navigateur où il a été demandé.
4. **Plan gratuit Supabase** : un projet inactif 7 jours est mis en pause ; à réactiver avant une démo.
5. **Dépôt dédié** : pour la ligne CV, un dépôt `ElliottLD/embruns` serait plus lisible que ce sous-dossier.
6. **Pré-génération de la démo** : aujourd'hui, le premier visiteur du jour attend ~20 s. Une tâche planifiée nocturne (pg_cron) pourra régénérer la démo à l'avance (étape 8).
7. **Scénarios et date du jour** : les scénarios sont testés pour une date fixe ; certaines dates (lendemain de Noël, fin des glaces) peuvent ajouter d'autres mouvements réels dans les données. À revérifier quand les détecteurs arriveront (étape 5).
