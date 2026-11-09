-- Démo : scénario du module Pricing (spec pricing, § 7). Le générateur
-- applique un historique de prix sur 16 semaines aux produits suivis, fait
-- réagir les quantités selon leur élasticité, puis crée les produits (prix,
-- coût) et les relevés de 2 concurrents. Relançable sans doublon : tout est
-- purgé puis recréé.

create or replace function public.generate_demo(p_merchant_id uuid, p jsonb, p_today date default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_today date;
  v_start date;
  v_seed text := p ->> 'seed';
  v_stamps int;
  v_result jsonb;
begin
  select m.timezone, m.stamps_required into v_tz, v_stamps
  from public.merchants m
  where m.id = p_merchant_id and m.is_demo;
  if not found then
    raise exception 'generate_demo: % n''est pas un commerce de démo', p_merchant_id;
  end if;

  v_today := coalesce(p_today, (now() at time zone v_tz)::date);
  v_start := v_today - (p ->> 'days')::int;

  -- 1. Purge des données du commerce de démo (ordre choisi pour éviter les
  --    mises à jour en cascade coûteuses). Les contrôles de clés étrangères
  --    sont exécutés ligne à ligne : on impose les index, sinon des tables
  --    sans statistiques à jour sont relues en entier pour chaque ligne.
  perform set_config('enable_seqscan', 'off', true);
  delete from public.products where merchant_id = p_merchant_id;
  delete from public.sale_items where merchant_id = p_merchant_id;
  delete from public.campaigns where merchant_id = p_merchant_id;
  delete from public.recommendations where merchant_id = p_merchant_id;
  delete from public.insights where merchant_id = p_merchant_id;
  delete from public.automation_sends where merchant_id = p_merchant_id;
  delete from public.import_jobs where merchant_id = p_merchant_id;
  delete from public.assistant_messages where merchant_id = p_merchant_id;
  delete from public.reviews where merchant_id = p_merchant_id;
  delete from public.visits where merchant_id = p_merchant_id;
  delete from public.sales where merchant_id = p_merchant_id;
  delete from public.customers where merchant_id = p_merchant_id;
  perform set_config('enable_seqscan', 'on', true);

  drop table if exists demo_days, demo_hour_cdf, demo_slots, demo_customers, demo_campaigns,
    demo_recipients, demo_visits, demo_sales, demo_prod_cdf, demo_prod_lookup, demo_lines, demo_pricing;

  -- 2. Jours d'ouverture et tickets attendus par jour.
  create temp table demo_days on commit drop as
  select d::date as day,
         extract(isodow from d)::int as dow,
         extract(month from d)::int as month,
         v_today - d::date as age,
         (p -> 'tickets_by_isodow' ->> extract(isodow from d)::int::text)::numeric
           * (p -> 'month_factor' ->> (extract(month from d)::int - 1))::numeric
           * (1 + (p ->> 'daily_noise')::numeric * (2 * private.rnd(v_seed || ':day:' || d::date) - 1)) as tickets
  from generate_series(v_start, v_today - 1, interval '1 day') d
  where extract(isodow from d)::int not in (
    select jsonb_array_elements_text(p -> 'closed_isodows')::int
  );
  analyze demo_days;

  -- Répartition cumulée des heures (pour tirer une heure au hasard).
  create temp table demo_hour_cdf on commit drop as
  with h as (select key::int as hour, value::numeric as w from jsonb_each_text(p -> 'hour_weights'))
  select hour,
         coalesce(sum(w) over (order by hour rows between unbounded preceding and 1 preceding), 0) / sum(w) over () as lo,
         sum(w) over (order by hour) / sum(w) over () as hi
  from h;
  analyze demo_hour_cdf;

  -- Tickets attendus par créneau horaire, scénario « créneau en baisse » inclus.
  create temp table demo_slots on commit drop as
  with h as (select key::int as hour, value::numeric as w from jsonb_each_text(p -> 'hour_weights')),
  s as (
    select dd.day, dd.dow, dd.age, h.hour, dd.tickets * h.w / sum(h.w) over (partition by dd.day) as expected
    from demo_days dd
    join h on h.hour <= coalesce((p -> 'last_hour_by_isodow' ->> dd.dow::text)::int, 23)
  )
  select s.day, s.dow, s.hour,
         s.expected * case
           when s.dow = (p #>> '{scenarios,slot_drop,isodow}')::int
            and s.hour >= (p #>> '{scenarios,slot_drop,from_hour}')::int
            and s.age <= (p #>> '{scenarios,slot_drop,days}')::int
           then 1 - (p #>> '{scenarios,slot_drop,drop}')::numeric else 1 end as expected
  from s;
  analyze demo_slots;

  -- 3. Clients : inscription progressive, fréquence, heure préférée, départs.
  create temp table demo_customers on commit drop as
  with base as (
    select i,
           gen_random_uuid() as id,
           case
             when i <= (p ->> 'initial_customers')::int
               then v_start + floor(14 * private.rnd(v_seed || ':c:' || i || ':signup'))::int
             else v_start + floor(
               (p ->> 'days')::int * power(
                 (i - (p ->> 'initial_customers')::int)::numeric
                   / ((p ->> 'customers')::int - (p ->> 'initial_customers')::int),
                 1 / (p ->> 'signup_curve')::numeric))::int
           end as raw_signup,
           ((p #>> '{visits_per_week,min}')::numeric
             + ((p #>> '{visits_per_week,max}')::numeric - (p #>> '{visits_per_week,min}')::numeric)
               * power(private.rnd(v_seed || ':c:' || i || ':freq'), (p #>> '{visits_per_week,skew}')::numeric))
             * case when i <= (p ->> 'initial_customers')::int then (p #>> '{visits_per_week,early_boost}')::numeric else 1 end
             as freq,
           private.rnd(v_seed || ':c:' || i || ':hour') as r_hour
    from generate_series(1, (p ->> 'customers')::int) i
  ),
  placed as (
    select b.*,
           -- Pas d'inscription un jour de fermeture, ni aujourd'hui.
           (select min(dd.day) from demo_days dd where dd.day >= least(b.raw_signup, v_today - 1)) as signup
    from base b
  )
  select pl.i, pl.id, coalesce(pl.signup, v_today - 2) as signup, pl.freq,
         (select hc.hour from demo_hour_cdf hc where pl.r_hour >= hc.lo and pl.r_hour < hc.hi) as pref_hour,
         case
           when private.rnd(v_seed || ':c:' || pl.i || ':lost') < (p ->> 'lost_rate')::numeric
            and coalesce(pl.signup, v_today) < v_today - 130
           then pl.signup + 30 + floor(private.rnd(v_seed || ':c:' || pl.i || ':stop')
                  * ((v_today - 95) - (pl.signup + 30)))::int
         end as stop_day,
         private.rnd(v_seed || ':c:' || pl.i || ':consent') < (p ->> 'marketing_consent_rate')::numeric as consent
  from placed pl;
  analyze demo_customers;

  -- Scénario : réguliers qui décrochent.
  update demo_customers c
  set stop_day = v_today - (p #>> '{scenarios,at_risk,min_days}')::int
    - floor(private.rnd(v_seed || ':c:' || c.i || ':atrisk')
      * ((p #>> '{scenarios,at_risk,max_days}')::int - (p #>> '{scenarios,at_risk,min_days}')::int + 1))::int
  where c.i in (
    select c2.i from demo_customers c2
    where c2.stop_day is null
      and c2.signup <= v_today - 150
      and c2.freq >= (p #>> '{scenarios,at_risk,min_visits_per_week}')::numeric
    order by private.rnd(v_seed || ':c:' || c2.i || ':pick')
    limit (p #>> '{scenarios,at_risk,count}')::int
  );

  -- 4. Visites : la première le jour de l'inscription, puis à un rythme propre
  --    à chaque client (habitudes régulières), avec quelques absences et
  --    quelques visites imprévues.
  create temp table demo_visits on commit drop as
  with cd as (
    select c.i, c.id, c.freq, c.pref_hour, c.signup, dd.day, dd.dow,
           row_number() over (partition by c.i order by dd.day) - 1 as n,
           private.rnd(v_seed || ':c:' || c.i || ':phase') as phase
    from demo_customers c
    join demo_days dd on dd.day >= c.signup and dd.day < coalesce(c.stop_day, v_today)
  )
  select cd.i, cd.id as customer_id, cd.day, cd.dow,
         case
           when private.rnd(v_seed || ':v:' || cd.i || ':' || cd.day || ':ph') < (p ->> 'preferred_hour_share')::numeric
             then cd.pref_hour
           else (select hc.hour from demo_hour_cdf hc
                 where private.rnd(v_seed || ':v:' || cd.i || ':' || cd.day || ':h') >= hc.lo
                   and private.rnd(v_seed || ':v:' || cd.i || ':' || cd.day || ':h') < hc.hi)
         end as hour
  from cd
  where cd.day = cd.signup
     or (floor(cd.n * cd.freq / 6 + cd.phase) > floor((cd.n - 1) * cd.freq / 6 + cd.phase)
         and private.rnd(v_seed || ':v:' || cd.i || ':' || cd.day || ':skip') >= (p ->> 'visit_skip_rate')::numeric)
     or private.rnd(v_seed || ':v:' || cd.i || ':' || cd.day || ':extra') < (p ->> 'extra_visit_rate')::numeric;
  create index on demo_visits (i, day);
  analyze demo_visits;

  -- 5. Campagnes passées : date d'envoi, destinataires, retours.
  create temp table demo_campaigns on commit drop as
  select ord::int as ord, x as def,
         case
           when make_date(extract(year from v_today)::int, (x ->> 'month')::int, (x ->> 'day')::int) <= v_today - 15
             then make_date(extract(year from v_today)::int, (x ->> 'month')::int, (x ->> 'day')::int)
           else make_date(extract(year from v_today)::int - 1, (x ->> 'month')::int, (x ->> 'day')::int)
         end as send_day,
         gen_random_uuid() as id
  from jsonb_array_elements(p -> 'campaigns') with ordinality as t(x, ord);
  delete from demo_campaigns where send_day < v_start;
  analyze demo_campaigns;

  create temp table demo_recipients on commit drop as
  select dc.id as campaign_id, dc.ord, dc.send_day, c.i, c.id as customer_id
  from demo_campaigns dc
  join demo_customers c on c.consent and c.signup < dc.send_day and (c.stop_day is null or c.stop_day > dc.send_day)
  where case dc.def ->> 'audience'
    when 'regular' then (select count(*) from demo_visits v
                         where v.i = c.i and v.day >= dc.send_day - 90 and v.day < dc.send_day) >= 3
    when 'lapsed' then not exists (select 1 from demo_visits v
                                   where v.i = c.i and v.day >= dc.send_day - 21 and v.day < dc.send_day)
    else true
  end;
  analyze demo_recipients;

  -- Effet des campagnes : visites supplémentaires dans les 14 jours.
  insert into demo_visits (i, customer_id, day, dow, hour)
  select r.i, r.customer_id, dd.day, dd.dow, c.pref_hour
  from demo_recipients r
  join demo_campaigns dc on dc.id = r.campaign_id
  join demo_customers c on c.i = r.i
  join lateral (
    select d2.day, d2.dow from demo_days d2
    where d2.day >= r.send_day + 1 + floor(13 * private.rnd(v_seed || ':cb:' || r.ord || ':' || r.i || ':d'))::int
      and d2.day <= r.send_day + 14
    order by d2.day limit 1
  ) dd on true
  where private.rnd(v_seed || ':cb:' || r.ord || ':' || r.i) < (dc.def ->> 'return_boost')::numeric
    and (c.stop_day is null or dd.day < c.stop_day)
    and dd.day < v_today;

  -- Une visite par client et par jour au plus (règle anti-abus), heure de fermeture respectée.
  create temp table demo_sales on commit drop as
  with v as (
    select distinct on (customer_id, day) i, customer_id, day, dow,
           -- Jour de fermeture anticipée : les habitudes de l'après-midi se
           -- reportent sur la matinée (sinon tout s'empile sur la dernière heure).
           case when hour > coalesce((p -> 'last_hour_by_isodow' ->> dow::text)::int, 23)
                then 7 + (hour - 7) % (coalesce((p -> 'last_hour_by_isodow' ->> dow::text)::int, 23) - 6)
                else hour end as hour
    from demo_visits
    order by customer_id, day, hour
  ),
  v_kept as (
    -- Le créneau en baisse touche aussi les clients connus.
    select v.* from v
    where not (
      v.dow = (p #>> '{scenarios,slot_drop,isodow}')::int
      and v.hour >= (p #>> '{scenarios,slot_drop,from_hour}')::int
      and v_today - v.day <= (p #>> '{scenarios,slot_drop,days}')::int
      and private.rnd(v_seed || ':drop:' || v.i || ':' || v.day) < (p #>> '{scenarios,slot_drop,drop}')::numeric
    )
  ),
  ident as (
    select gen_random_uuid() as id, customer_id, day, hour, 'c' || i as k from v_kept
  ),
  ident_count as (
    select day, hour, count(*) as n from ident group by day, hour
  ),
  anon as (
    select gen_random_uuid() as id, null::uuid as customer_id, s.day, s.hour, 'a' || s.hour || ':' || g as k
    from demo_slots s
    left join ident_count ic on ic.day = s.day and ic.hour = s.hour
    cross join lateral generate_series(1,
      greatest(0, floor(s.expected + private.rnd(v_seed || ':slot:' || s.day || ':' || s.hour))::int - coalesce(ic.n, 0)::int)) g
  ),
  all_sales as (select * from ident union all select * from anon)
  select a.id, a.customer_id, a.day, a.hour, a.k,
         ((a.day + make_interval(hours => a.hour,
                                 mins => floor(60 * private.rnd(v_seed || ':t:' || a.day || ':' || a.k))::int,
                                 secs => floor(60 * private.rnd(v_seed || ':s:' || a.day || ':' || a.k))::int))::timestamp
           at time zone v_tz) as occurred_at,
         extract(month from a.day)::int as month,
         v_today - a.day as age,
         case when a.hour < 11 then 'morning' when a.hour < 14 then 'midday' else 'afternoon' end as daypart
  from all_sales a;
  analyze demo_sales;

  -- 6. Produits : répartition cumulée par moment, mois et scénario « produit en hausse ».
  create temp table demo_prod_cdf on commit drop as
  with prod as (
    select x ->> 'name' as name, x ->> 'category' as category, (x ->> 'price')::numeric as price,
           (x ->> 'weight')::numeric as weight, (x ->> 'qty_max')::int as qty_max,
           case when x ? 'months' then array(select jsonb_array_elements_text(x -> 'months')::int) end as months,
           case when x ? 'boost_months' then array(select jsonb_array_elements_text(x -> 'boost_months')::int) end as boost_months,
           coalesce((x ->> 'boost')::numeric, 1) as boost
    from jsonb_array_elements(p -> 'products') x
  ),
  w as (
    select dp.daypart, m.month, u.uplift_on, pr.name, pr.category, pr.price, pr.qty_max,
           pr.weight
             * coalesce((p -> 'daypart_category_factor' -> dp.daypart ->> pr.category)::numeric, 1)
             * case when pr.months is null or m.month = any (pr.months) then 1 else 0 end
             * case when m.month = any (coalesce(pr.boost_months, '{}')) then pr.boost else 1 end
             * case when u.uplift_on and pr.name = p #>> '{scenarios,product_uplift,product}'
                    then 1 + (p #>> '{scenarios,product_uplift,uplift}')::numeric else 1 end as w
    from prod pr
    cross join (values ('morning'), ('midday'), ('afternoon')) dp(daypart)
    cross join generate_series(1, 12) m(month)
    cross join (values (false), (true)) u(uplift_on)
  )
  select daypart, month, uplift_on, name, category, price, qty_max,
         coalesce(sum(w) over g_prev, 0) / sum(w) over g_all as lo,
         sum(w) over g_cum / sum(w) over g_all as hi
  from w
  where w > 0
  window g_all as (partition by daypart, month, uplift_on),
         g_cum as (partition by daypart, month, uplift_on order by name),
         g_prev as (partition by daypart, month, uplift_on order by name rows between unbounded preceding and 1 preceding);
  analyze demo_prod_cdf;
  -- Table de correspondance à 1 000 cases : le tirage d'un produit devient une
  -- jointure par égalité (une jointure par intervalle est bien trop lente).
  create temp table demo_prod_lookup on commit drop as
  select pc.daypart, pc.month, pc.uplift_on, b.bucket, pc.name, pc.category, pc.price, pc.qty_max
  from generate_series(0, 999) b(bucket)
  join demo_prod_cdf pc on (b.bucket + 0.5) / 1000 >= pc.lo and (b.bucket + 0.5) / 1000 < pc.hi;
  analyze demo_prod_lookup;

  -- Lignes de ticket.
  create temp table demo_lines on commit drop as
  with lw as (
    select (ord - 1)::int + 1 as n_lines,
           coalesce(sum(value::numeric) over (order by ord rows between unbounded preceding and 1 preceding), 0)
             / sum(value::numeric) over () as lo,
           sum(value::numeric) over (order by ord) / sum(value::numeric) over () as hi
    from jsonb_array_elements_text(p -> 'lines_weights') with ordinality t(value, ord)
  ),
  s as (
    select ds.*, (select lw.n_lines from lw
                  where private.rnd(v_seed || ':n:' || ds.day || ':' || ds.k) >= lw.lo
                    and private.rnd(v_seed || ':n:' || ds.day || ':' || ds.k) < lw.hi) as n_lines
    from demo_sales ds
  ),
  l as (
    select s.id as sale_id, s.daypart, s.month,
           s.age <= (p #>> '{scenarios,product_uplift,days}')::int as uplift_on,
           private.rnd(v_seed || ':p:' || s.day || ':' || s.k || ':' || g) as r_prod,
           private.rnd(v_seed || ':q:' || s.day || ':' || s.k || ':' || g) as r_qty
    from s cross join lateral generate_series(1, s.n_lines) g
  )
  select l.sale_id, pc.name, pc.category, pc.price,
         sum(1 + floor(power(l.r_qty, 2.5) * pc.qty_max))::numeric as quantity
  from l
  join demo_prod_lookup pc
    on pc.daypart = l.daypart and pc.month = l.month and pc.uplift_on = l.uplift_on
   and pc.bucket = floor(l.r_prod * 1000)::int
  group by l.sale_id, pc.name, pc.category, pc.price;
  analyze demo_lines;

  -- 6 bis. Pricing : historique de prix des produits suivis et réaction des
  --        clients. Le multiplicateur de prix dépend de la semaine (indice 0 =
  --        la plus ancienne des N semaines, la semaine en cours reprend la
  --        dernière) ; la quantité suit q × (m / m_max)^e, toujours en hausse
  --        par rapport à la génération de base (pas de ligne supprimée).
  create temp table demo_pricing on commit drop as
  select x ->> 'product' as name,
         (x ->> 'elasticity')::numeric as elasticity,
         (x ->> 'unit_cost')::numeric as unit_cost,
         x -> 'multipliers' as mult,
         jsonb_array_length(x -> 'multipliers') as n,
         (select max(v::numeric) from jsonb_array_elements_text(x -> 'multipliers') v) as m_max,
         (x -> 'multipliers' ->> (jsonb_array_length(x -> 'multipliers') - 1))::numeric as m_current
  from jsonb_array_elements(coalesce(p #> '{pricing,products}', '[]'::jsonb)) x;

  update demo_lines l
     set price = round(l.price * x.m, 2),
         quantity = l.quantity + case when x.elasticity is null then 0 else
           floor(l.quantity * (power(x.m / x.m_max, x.elasticity) - 1)
                 + private.rnd(v_seed || ':pq:' || x.day || ':' || x.k || ':' || x.name)) end
  from (
    select dl.sale_id, dl.name, s.day, s.k, dp.elasticity, dp.m_max,
           (dp.mult ->> greatest(0, dp.n - greatest(1,
              (date_trunc('week', v_today::timestamp)::date - date_trunc('week', s.day::timestamp)::date) / 7)))::numeric as m
    from demo_lines dl
    join demo_sales s on s.id = dl.sale_id
    join demo_pricing dp on dp.name = dl.name
  ) x
  where l.sale_id = x.sale_id and l.name = x.name;

  -- 7. Écriture des tables.
  insert into public.customers (id, merchant_id, first_name, email, phone, birthday,
                                marketing_consent, marketing_consent_at, source, unsubscribed_at, created_at)
  select c.id, p_merchant_id, fn.name,
         translate(lower(fn.name), 'éèêëàâäîïôöûüç', 'eeeeaaaiioouuc') || '.' || c.i || '@demo.embruns.test',
         case when private.rnd(v_seed || ':c:' || c.i || ':phone') < (p ->> 'phone_rate')::numeric
              then '+336' || lpad((10000000 + c.i)::text, 8, '0') end,
         case when private.rnd(v_seed || ':c:' || c.i || ':bday') < (p ->> 'birthday_rate')::numeric
              then date '1950-01-01' + floor(20000 * private.rnd(v_seed || ':c:' || c.i || ':bdate'))::int end,
         c.consent,
         case when c.consent then (c.signup + time '09:00')::timestamp at time zone v_tz end,
         'demo',
         case when c.consent and private.rnd(v_seed || ':c:' || c.i || ':unsub') < (p ->> 'unsubscribe_rate')::numeric
              then (c.signup + 20 + time '20:00')::timestamp at time zone v_tz end,
         (c.signup + time '09:00')::timestamp at time zone v_tz
  from demo_customers c
  cross join lateral (
    select p -> 'first_names' ->> floor(jsonb_array_length(p -> 'first_names')
             * private.rnd(v_seed || ':c:' || c.i || ':name'))::int as name
  ) fn;

  insert into public.sales (id, merchant_id, source, external_id, occurred_at, total_amount, payment_method, customer_id)
  with totals as (
    select l.sale_id, sum(l.quantity * l.price) as total from demo_lines l group by l.sale_id
  ),
  pay as (
    select key,
           coalesce(sum(value::numeric) over (order by key rows between unbounded preceding and 1 preceding), 0)
             / sum(value::numeric) over () as lo,
           sum(value::numeric) over (order by key) / sum(value::numeric) over () as hi
    from jsonb_each_text(p -> 'payment_weights')
  ),
  s as (
    select ds.*, private.rnd(v_seed || ':pay:' || ds.day || ':' || ds.k) as r_pay from demo_sales ds
  )
  select s.id, p_merchant_id, 'demo', 'demo-' || s.day || '-' || s.k, s.occurred_at,
         coalesce(t.total, 0), pay.key, s.customer_id
  from s
  left join totals t on t.sale_id = s.id
  left join pay on s.r_pay >= pay.lo and s.r_pay < pay.hi;

  insert into public.sale_items (merchant_id, sale_id, product_name, category, quantity, unit_price)
  select p_merchant_id, l.sale_id, l.name, l.category, l.quantity, l.price from demo_lines l;

  insert into public.visits (merchant_id, customer_id, visited_at, amount, sale_id, source)
  select p_merchant_id, s.customer_id, s.occurred_at, sa.total_amount, s.id, 'demo'
  from demo_sales s join public.sales sa on sa.id = s.id
  where s.customer_id is not null;

  insert into public.loyalty_cards (merchant_id, customer_id, current_stamps, rewards_earned, last_stamp_at)
  select p_merchant_id, c.id, coalesce(v.n, 0) % v_stamps, coalesce(v.n, 0) / v_stamps, v.last_at
  from demo_customers c
  left join (select customer_id, count(*)::int as n, max(visited_at) as last_at
             from public.visits where merchant_id = p_merchant_id group by customer_id) v on v.customer_id = c.id;

  insert into public.campaigns (id, merchant_id, name, segment, subject, message, offer, status, created_at, sent_at)
  select dc.id, p_merchant_id, dc.def ->> 'name', (dc.def ->> 'segment')::public.customer_segment,
         dc.def ->> 'subject', dc.def ->> 'message', dc.def ->> 'offer', 'sent',
         (dc.send_day - 2 + time '18:00')::timestamp at time zone v_tz,
         (dc.send_day + time '10:00')::timestamp at time zone v_tz
  from demo_campaigns dc;

  insert into public.campaign_sends (merchant_id, campaign_id, customer_id, sent_at, opened_at, return_visit_id)
  select p_merchant_id, r.campaign_id, r.customer_id,
         (r.send_day + time '10:00')::timestamp at time zone v_tz,
         case when private.rnd(v_seed || ':open:' || r.ord || ':' || r.i) < (dc.def ->> 'open_rate')::numeric
              then (r.send_day + time '10:00')::timestamp at time zone v_tz
                   + make_interval(mins => floor(600 * private.rnd(v_seed || ':opent:' || r.ord || ':' || r.i))::int) end,
         (select v.id from public.visits v
          where v.customer_id = r.customer_id
            and v.visited_at > (r.send_day + time '10:00')::timestamp at time zone v_tz
            and v.visited_at <= (r.send_day + 14 + time '10:00')::timestamp at time zone v_tz
          order by v.visited_at limit 1)
  from demo_recipients r join demo_campaigns dc on dc.id = r.campaign_id;

  -- 8. Avis : un an d'avis notés, quasiment tous répondus, plus deux négatifs en attente.
  insert into public.reviews (merchant_id, source, external_id, rating, body, author_name, published_at,
                              reply, replied_at, status)
  with r as (
    select j,
           v_start + floor((p ->> 'days')::int * private.rnd(v_seed || ':r:' || j || ':day'))::int as day,
           private.rnd(v_seed || ':r:' || j || ':rating') as r_rating,
           p -> 'first_names' ->> floor(jsonb_array_length(p -> 'first_names') * private.rnd(v_seed || ':r:' || j || ':a'))::int as first_name,
           chr(65 + floor(26 * private.rnd(v_seed || ':r:' || j || ':i'))::int) as initial
    from generate_series(1, (p #>> '{reviews,count}')::int) j
  ),
  rw as (
    select key::int as rating,
           coalesce(sum(value::numeric) over (order by key rows between unbounded preceding and 1 preceding), 0)
             / sum(value::numeric) over () as lo,
           sum(value::numeric) over (order by key) / sum(value::numeric) over () as hi
    from jsonb_each_text(p #> '{reviews,rating_weights}')
  ),
  rr as (
    select r.*, rw.rating,
           ((r.day + make_interval(hours => 9 + floor(12 * private.rnd(v_seed || ':r:' || r.j || ':h'))::int))::timestamp
             at time zone v_tz) as published_at
    from r join rw on r.r_rating >= rw.lo and r.r_rating < rw.hi
  )
  select p_merchant_id, 'demo', 'demo-review-' || rr.j, rr.rating,
         p #> '{reviews,texts}' -> rr.rating::text ->> floor(jsonb_array_length(p #> '{reviews,texts}' -> rr.rating::text)
           * private.rnd(v_seed || ':r:' || rr.j || ':t'))::int,
         rr.first_name || ' ' || rr.initial || '.',
         rr.published_at,
         case when v_today - rr.day > 3 then
           replace(p #> '{reviews,replies}' -> (case when rr.rating >= 4 then 'positive' else 'negative' end)
                   ->> floor(2 * private.rnd(v_seed || ':r:' || rr.j || ':rep'))::int, '{prenom}', rr.first_name) end,
         case when v_today - rr.day > 3 then rr.published_at + interval '1 day' end,
         case when v_today - rr.day > 3 then 'replied' else 'to_handle' end::public.review_status
  from rr;

  insert into public.reviews (merchant_id, source, external_id, rating, body, author_name, published_at, status)
  select p_merchant_id, 'demo', 'demo-review-pending-' || ord, (x ->> 'rating')::int, x ->> 'text', x ->> 'author',
         ((v_today - (x ->> 'days_ago')::int) + time '19:30')::timestamp at time zone v_tz, 'to_handle'
  from jsonb_array_elements(p #> '{reviews,pending}') with ordinality t(x, ord);

  -- 9. Pricing : produits suivis (prix actuel, coût) et relevés concurrents.
  insert into public.products (merchant_id, name, category, price, unit_cost, min_margin_pct)
  select p_merchant_id, dp.name, prod ->> 'category',
         round((prod ->> 'price')::numeric * dp.m_current, 2), dp.unit_cost,
         coalesce((p #>> '{pricing,min_margin_pct}')::numeric, 30)
  from demo_pricing dp
  join jsonb_array_elements(p -> 'products') prod on prod ->> 'name' = dp.name;

  insert into public.competitor_prices (merchant_id, product_id, competitor_name, price, observed_at)
  select p_merchant_id, pr.id, c ->> 'name',
         round(pr.price * r.value::numeric * 20) / 20,
         v_today - (c ->> 'days_ago')::int
  from jsonb_array_elements(coalesce(p #> '{pricing,competitors}', '[]'::jsonb)) c
  cross join lateral jsonb_each_text(c -> 'ratios') r
  join public.products pr on pr.merchant_id = p_merchant_id and pr.name = r.key;

  update public.merchants set demo_generated_on = v_today where id = p_merchant_id;

  -- Statistiques à jour pour que les KPI soient rapides tout de suite.
  analyze public.sales, public.sale_items, public.visits, public.customers, public.loyalty_cards;

  select jsonb_build_object(
    'today', v_today,
    'sales', (select count(*) from demo_sales),
    'sale_items', (select count(*) from demo_lines),
    'customers', (select count(*) from demo_customers),
    'visits', (select count(*) from public.visits where merchant_id = p_merchant_id),
    'reviews', (select count(*) from public.reviews where merchant_id = p_merchant_id),
    'campaigns', (select count(*) from demo_campaigns)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.generate_demo(uuid, jsonb, date) from public, anon, authenticated;
grant execute on function public.generate_demo(uuid, jsonb, date) to service_role;
