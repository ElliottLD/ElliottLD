-- Module Pricing (spec SPEC_module_pricing_embruns.md, section 3).
--
-- Les ventes viennent des tables existantes sales / sale_items (une ligne par
-- produit vendu, avec le prix réellement pratiqué) : products.name correspond
-- à sale_items.product_name. Toutes les tables portent merchant_id, RLS et des
-- clés composites (merchant_id, id), comme le reste du schéma.

create type public.price_confidence as enum ('high', 'medium', 'low');
create type public.price_recommendation_status as enum ('proposed', 'accepted', 'ignored');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  category text,
  price numeric(10, 2) not null check (price >= 0),
  unit_cost numeric(10, 2) not null default 0 check (unit_cost >= 0),
  min_margin_pct numeric(5, 2) not null default 30 check (min_margin_pct between 0 and 95),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, id),
  unique (merchant_id, name)
);

create table public.competitor_prices (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null,
  product_id uuid not null,
  competitor_name text not null check (length(trim(competitor_name)) between 1 and 80),
  price numeric(10, 2) not null check (price > 0),
  observed_at date not null default current_date,
  created_at timestamptz not null default now(),
  foreign key (merchant_id, product_id) references public.products (merchant_id, id) on delete cascade
);
create index competitor_prices_product_date on public.competitor_prices (product_id, observed_at);

create table public.price_recommendations (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null,
  product_id uuid not null,
  current_price numeric(10, 2) not null,
  recommended_price numeric(10, 2) not null,
  elasticity numeric(6, 3) not null,
  confidence public.price_confidence not null,
  estimated_weekly_impact numeric(10, 2) not null,
  price_index numeric(6, 1),
  explanation text not null,
  explanation_source text not null check (explanation_source in ('ai', 'template')),
  status public.price_recommendation_status not null default 'proposed',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (merchant_id, id),
  foreign key (merchant_id, product_id) references public.products (merchant_id, id) on delete cascade
);
create index price_recommendations_product on public.price_recommendations (product_id, created_at);

create table public.product_price_changes (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null,
  product_id uuid not null,
  old_price numeric(10, 2) not null,
  new_price numeric(10, 2) not null,
  source text not null check (source in ('recommendation', 'manual')),
  recommendation_id uuid,
  changed_at timestamptz not null default now(),
  foreign key (merchant_id, product_id) references public.products (merchant_id, id) on delete cascade,
  foreign key (merchant_id, recommendation_id) references public.price_recommendations (merchant_id, id) on delete set null (recommendation_id)
);
create index product_price_changes_product on public.product_price_changes (product_id, changed_at);

do $$
declare
  t text;
begin
  foreach t in array array['products', 'competitor_prices', 'price_recommendations', 'product_price_changes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using ((select private.owns_merchant(merchant_id)))
         with check ((select private.owns_merchant(merchant_id)))',
      t || '_owner', t
    );
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end
$$;

-- Produits suivis, avec prix concurrents récents et CA des 30 derniers jours.
-- Prix concurrent : dernier relevé de chaque concurrent sur 30 jours, puis moyenne.
create or replace function public.pricing_products(p_merchant_id uuid)
returns table (
  product_id uuid,
  name text,
  category text,
  price numeric,
  unit_cost numeric,
  min_margin_pct numeric,
  competitor_avg_price numeric,
  competitor_count bigint,
  revenue_30d numeric,
  quantity_30d numeric,
  last_price_change_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with m as (
    select timezone, (now() at time zone timezone)::date as today from public.merchants where id = p_merchant_id
  )
  select p.id, p.name, p.category, p.price, p.unit_cost, p.min_margin_pct,
         cp.avg_price, coalesce(cp.n, 0),
         coalesce(rev.revenue, 0), coalesce(rev.quantity, 0),
         (select max(pc.changed_at) from public.product_price_changes pc where pc.product_id = p.id)
  from public.products p
  cross join m
  left join lateral (
    select round(avg(latest.price), 2) as avg_price, count(*) as n
    from (
      select distinct on (c.competitor_name) c.price
      from public.competitor_prices c
      where c.product_id = p.id and c.observed_at > m.today - 30
      order by c.competitor_name, c.observed_at desc, c.created_at desc
    ) latest
  ) cp on true
  left join lateral (
    select sum(i.quantity * i.unit_price) as revenue, sum(i.quantity) as quantity
    from public.sale_items i
    join public.sales s on s.id = i.sale_id
    where i.merchant_id = p.merchant_id and i.product_name = p.name
      and s.occurred_at >= ((m.today - 30)::timestamp at time zone m.timezone)
      and s.occurred_at < (m.today::timestamp at time zone m.timezone)
  ) rev on true
  where p.merchant_id = p_merchant_id
  order by p.name
$$;

-- Ventes hebdomadaires (semaines complètes, du lundi au dimanche, fuseau du
-- commerce) des produits suivis : quantité et CA, d'où le prix moyen pondéré.
create or replace function public.pricing_weekly_sales(p_merchant_id uuid, p_weeks int default 16)
returns table (product_id uuid, week_start date, quantity numeric, revenue numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with m as (
    select timezone, date_trunc('week', (now() at time zone timezone))::date as current_week
    from public.merchants where id = p_merchant_id
  )
  select p.id,
         date_trunc('week', s.occurred_at at time zone m.timezone)::date,
         sum(i.quantity),
         sum(i.quantity * i.unit_price)
  from public.products p
  cross join m
  join public.sale_items i on i.merchant_id = p.merchant_id and i.product_name = p.name
  join public.sales s on s.id = i.sale_id
  where p.merchant_id = p_merchant_id
    and s.occurred_at >= ((m.current_week - 7 * least(greatest(p_weeks, 1), 104))::timestamp at time zone m.timezone)
    and s.occurred_at < (m.current_week::timestamp at time zone m.timezone)
  group by 1, 2
  order by 1, 2
$$;

revoke execute on function public.pricing_products(uuid) from public, anon;
revoke execute on function public.pricing_weekly_sales(uuid, int) from public, anon;
grant execute on function public.pricing_products(uuid) to authenticated, service_role;
grant execute on function public.pricing_weekly_sales(uuid, int) to authenticated, service_role;
