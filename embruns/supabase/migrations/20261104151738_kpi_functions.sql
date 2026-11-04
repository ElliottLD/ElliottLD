-- KPI et segments (sections 4.2 et 4.3), calculés en SQL et testés.
--
-- Conventions :
-- * les périodes sont des jours calendaires inclusifs [p_start, p_end], dans le
--   fuseau du commerce ;
-- * la période de comparaison est la période précédente de même durée ;
-- * security invoker : RLS s'applique, un commerçant n'obtient que ses chiffres.

-- Bornes horaires d'une période locale.
create or replace function private.period_bounds(p_merchant_id uuid, p_start date, p_end date,
                                                 out lo timestamptz, out hi timestamptz)
language sql
stable
set search_path = ''
as $$
  select (p_start::timestamp at time zone m.timezone), ((p_end + 1)::timestamp at time zone m.timezone)
  from public.merchants m where m.id = p_merchant_id
$$;
revoke all on function private.period_bounds(uuid, date, date) from public;
grant execute on function private.period_bounds(uuid, date, date) to authenticated, service_role;

-- Bandeau de KPI : période demandée et période précédente de même durée.
create or replace function public.kpi_summary(p_merchant_id uuid, p_start date, p_end date)
returns table (
  period text,
  period_start date,
  period_end date,
  revenue numeric,
  tickets bigint,
  avg_basket numeric,
  identified_revenue numeric,
  identified_share numeric,
  new_customers bigint,
  returned_30d bigint,
  return_rate_30d numeric,
  active_customers bigint,
  visits bigint,
  visit_frequency numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with periods as (
    select 'current' as period, p_start as s, p_end as e
    union all
    select 'previous', p_start - (p_end - p_start + 1), p_start - 1
  ),
  b as (
    select pr.period, pr.s, pr.e, pb.lo, pb.hi
    from periods pr cross join lateral private.period_bounds(p_merchant_id, pr.s, pr.e) pb
  )
  select b.period, b.s, b.e,
         coalesce(sa.revenue, 0),
         coalesce(sa.tickets, 0),
         case when sa.tickets > 0 then round(sa.revenue / sa.tickets, 2) end,
         coalesce(sa.identified, 0),
         case when sa.revenue > 0 then round(sa.identified / sa.revenue, 4) end,
         coalesce(nc.n, 0),
         coalesce(nc.returned, 0),
         case when nc.n > 0 then round(nc.returned::numeric / nc.n, 4) end,
         coalesce(vi.customers, 0),
         coalesce(vi.n, 0),
         case when vi.customers > 0
              then round(vi.n::numeric / vi.customers / ((b.e - b.s + 1) / 30.0), 2) end
  from b
  left join lateral (
    select sum(s.total_amount) as revenue, count(*) as tickets,
           sum(s.total_amount) filter (where s.customer_id is not null) as identified
    from public.sales s
    where s.merchant_id = p_merchant_id and s.occurred_at >= b.lo and s.occurred_at < b.hi
  ) sa on true
  left join lateral (
    -- Taux de retour : part des nouveaux inscrits revenus dans les 30 jours.
    select count(*) as n,
           count(*) filter (where exists (
             select 1 from public.visits v
             where v.customer_id = c.id
               and v.visited_at > c.created_at + interval '12 hours'
               and v.visited_at <= c.created_at + interval '30 days'
           )) as returned
    from public.customers c
    where c.merchant_id = p_merchant_id and c.created_at >= b.lo and c.created_at < b.hi
  ) nc on true
  left join lateral (
    select count(*) as n, count(distinct v.customer_id) as customers
    from public.visits v
    where v.merchant_id = p_merchant_id and v.visited_at >= b.lo and v.visited_at < b.hi
  ) vi on true
  order by b.period
$$;

-- Chiffre d'affaires par jour.
create or replace function public.sales_by_day(p_merchant_id uuid, p_start date, p_end date)
returns table (day date, revenue numeric, tickets bigint, identified_revenue numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with b as (select * from private.period_bounds(p_merchant_id, p_start, p_end)),
  m as (select timezone from public.merchants where id = p_merchant_id),
  agg as (
    select (s.occurred_at at time zone m.timezone)::date as day,
           sum(s.total_amount) as revenue,
           count(*) as tickets,
           sum(s.total_amount) filter (where s.customer_id is not null) as identified
    from public.sales s cross join m
    where s.merchant_id = p_merchant_id
      and s.occurred_at >= (select lo from b) and s.occurred_at < (select hi from b)
    group by 1
  )
  select d::date, coalesce(agg.revenue, 0), coalesce(agg.tickets, 0), coalesce(agg.identified, 0)
  from generate_series(p_start, p_end, interval '1 day') d
  left join agg on agg.day = d::date
  order by d
$$;

-- CA par jour de semaine × heure (carte de chaleur).
create or replace function public.sales_by_slot(p_merchant_id uuid, p_start date, p_end date)
returns table (isodow int, hour int, revenue numeric, tickets bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with b as (select * from private.period_bounds(p_merchant_id, p_start, p_end)),
  m as (select timezone from public.merchants where id = p_merchant_id)
  select extract(isodow from s.occurred_at at time zone m.timezone)::int,
         extract(hour from s.occurred_at at time zone m.timezone)::int,
         sum(s.total_amount),
         count(*)
  from public.sales s cross join m
  where s.merchant_id = p_merchant_id
    and s.occurred_at >= (select lo from b) and s.occurred_at < (select hi from b)
  group by 1, 2
  order by 1, 2
$$;

-- Top produits en CA et en quantité, avec la période précédente de même durée.
create or replace function public.top_products(p_merchant_id uuid, p_start date, p_end date, p_limit int default 10)
returns table (
  product_name text,
  category text,
  revenue numeric,
  quantity numeric,
  previous_revenue numeric,
  previous_quantity numeric,
  rank_revenue bigint,
  rank_quantity bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with cur as (select * from private.period_bounds(p_merchant_id, p_start, p_end)),
  prev as (select * from private.period_bounds(p_merchant_id, p_start - (p_end - p_start + 1), p_start - 1)),
  agg as (
    select i.product_name, max(i.category) as category,
           sum(i.quantity * i.unit_price) filter (where s.occurred_at >= cur.lo and s.occurred_at < cur.hi) as revenue,
           sum(i.quantity) filter (where s.occurred_at >= cur.lo and s.occurred_at < cur.hi) as quantity,
           sum(i.quantity * i.unit_price) filter (where s.occurred_at < cur.lo) as previous_revenue,
           sum(i.quantity) filter (where s.occurred_at < cur.lo) as previous_quantity
    from public.sale_items i
    join public.sales s on s.id = i.sale_id
    cross join cur cross join prev
    where i.merchant_id = p_merchant_id
      and s.occurred_at >= prev.lo and s.occurred_at < cur.hi
    group by i.product_name
  ),
  ranked as (
    select a.product_name, a.category, coalesce(a.revenue, 0) as revenue, coalesce(a.quantity, 0) as quantity,
           coalesce(a.previous_revenue, 0) as previous_revenue, coalesce(a.previous_quantity, 0) as previous_quantity,
           rank() over (order by coalesce(a.revenue, 0) desc, a.product_name) as rank_revenue,
           rank() over (order by coalesce(a.quantity, 0) desc, a.product_name) as rank_quantity
    from agg a
    where a.revenue > 0
  )
  select * from ranked
  where rank_revenue <= p_limit or rank_quantity <= p_limit
  order by rank_revenue
$$;

-- Segments clients (section 4.2), à une date donnée (aujourd'hui par défaut).
-- Un client appartient à un seul segment, par priorité :
-- perdu > à risque > VIP > régulier > nouveau > occasionnel.
create or replace function public.customer_segments(p_merchant_id uuid, p_as_of date default null)
returns table (
  customer_id uuid,
  first_name text,
  segment text,
  visits_90d bigint,
  spend_90d numeric,
  first_visit_at timestamptz,
  last_visit_at timestamptz,
  median_interval_days numeric,
  days_since_last_visit numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with m as (
    select timezone,
           ((coalesce(p_as_of, (now() at time zone timezone)::date) + 1)::timestamp at time zone timezone) as as_of_end
    from public.merchants where id = p_merchant_id
  ),
  c as (
    select cu.id, cu.first_name, cu.created_at
    from public.customers cu
    where cu.merchant_id = p_merchant_id and cu.anonymized_at is null
      and cu.created_at < (select as_of_end from m)
  ),
  v as (
    select vi.customer_id, vi.visited_at,
           vi.visited_at - lag(vi.visited_at) over (partition by vi.customer_id order by vi.visited_at) as gap
    from public.visits vi
    where vi.merchant_id = p_merchant_id and vi.visited_at < (select as_of_end from m)
  ),
  stats as (
    select c.id, c.first_name,
           least(c.created_at, min(v.visited_at)) as first_visit_at,
           max(v.visited_at) as last_visit_at,
           count(v.visited_at) filter (where v.visited_at >= (select as_of_end from m) - interval '90 days') as visits_90d,
           percentile_cont(0.5) within group (order by extract(epoch from v.gap) / 86400)
             filter (where v.visited_at >= (select as_of_end from m) - interval '90 days'
                       and v.gap is not null) as median_interval_days
    from c left join v on v.customer_id = c.id
    group by c.id, c.first_name, c.created_at
  ),
  spend as (
    select s.customer_id, sum(s.total_amount) as spend_90d
    from public.sales s
    where s.merchant_id = p_merchant_id and s.customer_id is not null
      and s.occurred_at >= (select as_of_end from m) - interval '90 days'
      and s.occurred_at < (select as_of_end from m)
    group by s.customer_id
  ),
  enriched as (
    select st.*, coalesce(sp.spend_90d, 0) as spend_90d,
           extract(epoch from (select as_of_end from m) - coalesce(st.last_visit_at, st.first_visit_at)) / 86400 as days_since,
           -- Rang de dépense parmi les clients ayant dépensé sur 90 jours, et leur nombre.
           case when coalesce(sp.spend_90d, 0) > 0
                then rank() over (partition by coalesce(sp.spend_90d, 0) > 0 order by coalesce(sp.spend_90d, 0) desc) end as spend_rank,
           count(*) over (partition by coalesce(sp.spend_90d, 0) > 0) as spenders
    from stats st left join spend sp on sp.customer_id = st.id
  )
  select e.id, e.first_name,
         case
           when e.days_since > 90 then 'lost'
           when e.visits_90d >= 3 and e.days_since > 21 and e.days_since > 2 * e.median_interval_days then 'at_risk'
           -- VIP : top 10 % de la dépense sur 90 jours (au moins un client).
           when e.spend_rank <= greatest(1, round(0.1 * e.spenders)) then 'vip'
           when e.visits_90d >= 3 then 'regular'
           when e.first_visit_at >= (select as_of_end from m) - interval '30 days' then 'new'
           else 'occasional'
         end,
         e.visits_90d, e.spend_90d, e.first_visit_at, e.last_visit_at,
         round(e.median_interval_days::numeric, 1), round(e.days_since::numeric, 1)
  from enriched e
$$;

revoke execute on function public.kpi_summary(uuid, date, date) from public, anon;
revoke execute on function public.sales_by_day(uuid, date, date) from public, anon;
revoke execute on function public.sales_by_slot(uuid, date, date) from public, anon;
revoke execute on function public.top_products(uuid, date, date, int) from public, anon;
revoke execute on function public.customer_segments(uuid, date) from public, anon;
grant execute on function public.kpi_summary(uuid, date, date) to authenticated, service_role;
grant execute on function public.sales_by_day(uuid, date, date) to authenticated, service_role;
grant execute on function public.sales_by_slot(uuid, date, date) to authenticated, service_role;
grant execute on function public.top_products(uuid, date, date, int) to authenticated, service_role;
grant execute on function public.customer_segments(uuid, date) to authenticated, service_role;
