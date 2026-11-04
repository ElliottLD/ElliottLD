-- Embruns — schéma initial (cahier des charges, section 6.1)
--
-- Principes :
-- * chaque table métier porte un merchant_id, protégé par RLS ;
-- * les relations entre tables passent par des clés étrangères composites
--   (merchant_id, id) : une ligne ne peut jamais pointer vers la donnée d'un
--   autre commerce, même par erreur de code ;
-- * les pages publiques (inscription, carte) n'ont AUCUNE politique pour le
--   rôle anon : elles passent par le serveur (clé service_role) avec
--   limitation de débit (section 9).

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.brand_tone as enum ('warm', 'sober', 'playful');
create type public.customer_segment as enum ('new', 'regular', 'vip', 'at_risk', 'lost');
create type public.customer_source as enum ('qr', 'manual', 'import', 'demo');
create type public.visit_source as enum ('scan', 'phone', 'demo');
create type public.sales_source as enum ('csv', 'sumup', 'demo');
create type public.review_status as enum ('to_handle', 'replied');
create type public.review_source as enum ('demo', 'google');
create type public.campaign_status as enum ('draft', 'sending', 'sent');
create type public.automation_type as enum ('welcome', 'win_back', 'birthday', 'reward_near', 'review_request');
create type public.action_type as enum ('campaign', 'review_request', 'review_reply', 'offer');
create type public.recommendation_status as enum ('proposed', 'launched', 'ignored');
create type public.integration_provider as enum ('sumup');
create type public.integration_status as enum ('connected', 'error', 'disconnected');
create type public.import_status as enum ('pending', 'processing', 'done', 'failed');
create type public.assistant_role as enum ('user', 'assistant', 'tool');

-- ---------------------------------------------------------------------------
-- Commerce
-- ---------------------------------------------------------------------------

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  business_type text not null default 'bakery',
  -- Identifiant public de la page d'inscription (QR du comptoir) : aléatoire.
  signup_slug text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  logo_path text,
  brand_color text not null default '#0B2545' check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  google_review_url text,
  brand_tone public.brand_tone not null default 'warm',
  stamps_required smallint not null default 10 check (stamps_required between 2 and 50),
  reward_label text not null default 'Une viennoiserie offerte',
  timezone text not null default 'Europe/Paris',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
-- Un seul commerce par compte en V1 (section 2 : pas de multi-établissements).
create unique index merchants_owner_unique on public.merchants (owner_id);

-- ---------------------------------------------------------------------------
-- Clients et fidélité
-- ---------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  first_name text check (length(first_name) <= 60),
  email text check (email is null or email = lower(trim(email))),
  -- Téléphone normalisé au format E.164 (+33…).
  phone text check (phone is null or phone ~ '^\+[1-9][0-9]{6,14}$'),
  birthday date,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  source public.customer_source not null default 'qr',
  unsubscribed_at timestamptz,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  unique (merchant_id, id),
  -- Consentement horodaté (section 9).
  constraint consent_is_timestamped check (not marketing_consent or marketing_consent_at is not null),
  -- Un client actif est joignable ; un client anonymisé ne garde aucune donnée.
  constraint contact_or_anonymized check (
    (anonymized_at is null and (email is not null or phone is not null))
    or (anonymized_at is not null and email is null and phone is null and first_name is null and birthday is null)
  )
);
-- Dédoublonnage par email ou téléphone normalisé (section 4.1).
create unique index customers_email_unique on public.customers (merchant_id, email) where email is not null;
create unique index customers_phone_unique on public.customers (merchant_id, phone) where phone is not null;

create table public.loyalty_cards (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null,
  customer_id uuid not null,
  -- Jeton public long et aléatoire, jamais séquentiel (section 9).
  public_token text not null unique default encode(extensions.gen_random_bytes(24), 'hex')
    check (length(public_token) >= 32),
  current_stamps smallint not null default 0 check (current_stamps >= 0),
  rewards_earned integer not null default 0 check (rewards_earned >= 0),
  last_stamp_at timestamptz,
  created_at timestamptz not null default now(),
  unique (merchant_id, id),
  unique (customer_id),
  foreign key (merchant_id, customer_id) references public.customers (merchant_id, id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Ventes (lues depuis la caisse, jamais encaissées)
-- ---------------------------------------------------------------------------

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  source public.sales_source not null,
  external_id text not null,
  occurred_at timestamptz not null,
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  payment_method text,
  customer_id uuid,
  created_at timestamptz not null default now(),
  unique (merchant_id, id),
  -- Imports idempotents (section 6.1).
  unique (merchant_id, source, external_id),
  foreign key (merchant_id, customer_id) references public.customers (merchant_id, id) on delete set null (customer_id)
);
create index sales_merchant_time on public.sales (merchant_id, occurred_at);
create index sales_customer on public.sales (customer_id) where customer_id is not null;

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null,
  sale_id uuid not null,
  product_name text not null,
  category text,
  quantity numeric(10, 3) not null default 1 check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  foreign key (merchant_id, sale_id) references public.sales (merchant_id, id) on delete cascade
);
create index sale_items_sale on public.sale_items (sale_id);
create index sale_items_merchant_product on public.sale_items (merchant_id, product_name);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null,
  customer_id uuid not null,
  visited_at timestamptz not null default now(),
  amount numeric(10, 2) check (amount is null or amount >= 0),
  sale_id uuid,
  source public.visit_source not null default 'scan',
  created_at timestamptz not null default now(),
  unique (merchant_id, id),
  foreign key (merchant_id, customer_id) references public.customers (merchant_id, id) on delete cascade,
  foreign key (merchant_id, sale_id) references public.sales (merchant_id, id) on delete set null (sale_id)
);
create index visits_customer_time on public.visits (customer_id, visited_at);
create index visits_merchant_time on public.visits (merchant_id, visited_at);
create unique index visits_sale_unique on public.visits (sale_id) where sale_id is not null;

-- ---------------------------------------------------------------------------
-- Avis
-- ---------------------------------------------------------------------------

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  source public.review_source not null default 'demo',
  external_id text,
  rating smallint not null check (rating between 1 and 5),
  body text,
  author_name text,
  published_at timestamptz not null,
  reply text,
  replied_at timestamptz,
  status public.review_status not null default 'to_handle',
  customer_id uuid,
  created_at timestamptz not null default now(),
  unique (merchant_id, id),
  unique (merchant_id, source, external_id),
  foreign key (merchant_id, customer_id) references public.customers (merchant_id, id) on delete set null (customer_id),
  constraint replied_has_reply check (status <> 'replied' or (reply is not null and replied_at is not null))
);
create index reviews_merchant_time on public.reviews (merchant_id, published_at);

-- ---------------------------------------------------------------------------
-- Insights et recommandations
-- ---------------------------------------------------------------------------

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  week_start date not null,
  detector text not null,
  payload jsonb not null,
  estimated_impact_eur numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (merchant_id, id)
);
create index insights_merchant_week on public.insights (merchant_id, week_start);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  week_start date not null,
  source_insight_ids uuid[] not null default '{}',
  title text not null,
  explanation text not null,
  action_type public.action_type not null,
  target_segment public.customer_segment,
  draft jsonb not null default '{}',
  estimated_impact_eur numeric(10, 2) not null default 0,
  status public.recommendation_status not null default 'proposed',
  review_id uuid,
  launched_at timestamptz,
  created_at timestamptz not null default now(),
  unique (merchant_id, id),
  foreign key (merchant_id, review_id) references public.reviews (merchant_id, id) on delete set null (review_id)
);
create index recommendations_merchant_week on public.recommendations (merchant_id, week_start);

-- ---------------------------------------------------------------------------
-- Campagnes et automatismes
-- ---------------------------------------------------------------------------

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  name text not null,
  segment public.customer_segment,
  subject text not null,
  message text not null,
  offer text,
  status public.campaign_status not null default 'draft',
  recommendation_id uuid,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (merchant_id, id),
  foreign key (merchant_id, recommendation_id) references public.recommendations (merchant_id, id) on delete set null (recommendation_id)
);

create table public.campaign_sends (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null,
  campaign_id uuid not null,
  customer_id uuid,
  provider_message_id text,
  sent_at timestamptz,
  opened_at timestamptz,
  -- Visite de retour en boutique sous 14 jours (section 4.5).
  return_visit_id uuid,
  unique (campaign_id, customer_id),
  foreign key (merchant_id, campaign_id) references public.campaigns (merchant_id, id) on delete cascade,
  foreign key (merchant_id, customer_id) references public.customers (merchant_id, id) on delete set null (customer_id),
  foreign key (merchant_id, return_visit_id) references public.visits (merchant_id, id) on delete set null (return_visit_id)
);
create index campaign_sends_campaign on public.campaign_sends (campaign_id);

create table public.automations (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  type public.automation_type not null,
  is_active boolean not null default false,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (merchant_id, type)
);

-- Écart assumé avec la section 6.1 : journal des emails automatiques
-- (bienvenue, relances, anniversaires, demandes d'avis). Il porte les règles
-- « au plus une fois tous les 90 jours » et le suivi envoi / ouverture.
create table public.automation_sends (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null,
  type public.automation_type not null,
  customer_id uuid,
  visit_id uuid,
  scheduled_for timestamptz not null default now(),
  provider_message_id text,
  sent_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (merchant_id, customer_id) references public.customers (merchant_id, id) on delete set null (customer_id),
  foreign key (merchant_id, visit_id) references public.visits (merchant_id, id) on delete set null (visit_id)
);
create index automation_sends_customer on public.automation_sends (customer_id, type, created_at);
create index automation_sends_pending on public.automation_sends (scheduled_for) where sent_at is null;

-- ---------------------------------------------------------------------------
-- Intégrations et imports
-- ---------------------------------------------------------------------------

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  provider public.integration_provider not null,
  status public.integration_status not null default 'disconnected',
  external_account_id text,
  -- Chiffrés côté serveur (AES-GCM) ; jamais lisibles par le client (voir grants plus bas).
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  sync_cursor text,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (merchant_id, provider)
);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  file_path text,
  file_name text,
  column_mapping jsonb not null default '{}',
  status public.import_status not null default 'pending',
  rows_total integer not null default 0,
  rows_imported integer not null default 0,
  rows_duplicate integer not null default 0,
  rows_error integer not null default 0,
  errors jsonb not null default '[]',
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  role public.assistant_role not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);
create index assistant_messages_merchant_time on public.assistant_messages (merchant_id, created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

-- Vrai si l'utilisateur connecté possède ce commerce. security definer pour
-- éviter une récursion RLS sur merchants ; search_path vide par sécurité.
create or replace function private.owns_merchant(target_merchant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.merchants m
    where m.id = target_merchant_id
      and m.owner_id = (select auth.uid())
  );
$$;
revoke all on function private.owns_merchant(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.owns_merchant(uuid) to authenticated;

alter table public.merchants enable row level security;
create policy merchants_select on public.merchants for select to authenticated
  using (owner_id = (select auth.uid()));
create policy merchants_insert on public.merchants for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy merchants_update on public.merchants for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy merchants_delete on public.merchants for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Même politique pour toutes les tables portant un merchant_id.
do $$
declare
  t text;
begin
  foreach t in array array[
    'customers', 'loyalty_cards', 'sales', 'sale_items', 'visits', 'reviews',
    'insights', 'recommendations', 'campaigns', 'campaign_sends', 'automations',
    'automation_sends', 'integrations', 'import_jobs', 'assistant_messages'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using ((select private.owns_merchant(merchant_id)))
         with check ((select private.owns_merchant(merchant_id)))',
      t || '_owner', t
    );
  end loop;
end
$$;

-- Droits explicites (ne pas dépendre des privilèges par défaut du projet) :
-- le commerçant connecté passe par RLS, le serveur par service_role.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- Aucun accès anonyme direct aux tables (les pages publiques passent par le serveur).
revoke all on all tables in schema public from anon;

-- Jetons OAuth : le navigateur du commerçant ne peut ni les lire ni les écrire.
revoke select, insert, update on public.integrations from authenticated;
grant select (id, merchant_id, provider, status, external_account_id, token_expires_at,
              sync_cursor, last_synced_at, last_error, created_at)
  on public.integrations to authenticated;
grant delete on public.integrations to authenticated;
