-- Avis, résultats de campagnes et tampons de fidélité (sections 4.1, 4.4, 4.5).

-- Synthèse des avis : note moyenne, évolution sur 90 jours, taux de réponse.
create or replace function public.review_summary(p_merchant_id uuid)
returns table (
  reviews_count bigint,
  rating_avg numeric,
  rating_avg_90d_ago numeric,
  new_reviews_90d bigint,
  rating_avg_last_30d numeric,
  to_handle bigint,
  response_rate numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*),
         round(avg(r.rating), 2),
         round(avg(r.rating) filter (where r.published_at < now() - interval '90 days'), 2),
         count(*) filter (where r.published_at >= now() - interval '90 days'),
         round(avg(r.rating) filter (where r.published_at >= now() - interval '30 days'), 2),
         count(*) filter (where r.status = 'to_handle'),
         case when count(*) > 0 then round(count(*) filter (where r.status = 'replied')::numeric / count(*), 4) end
  from public.reviews r
  where r.merchant_id = p_merchant_id
$$;

-- Résultats des campagnes : une campagne est « gagnante » pour un client s'il
-- revient en boutique dans les 14 jours ; CA associé = ventes de ces clients
-- dans les 14 jours suivant l'envoi.
create or replace function public.campaign_results(p_merchant_id uuid)
returns table (
  campaign_id uuid,
  name text,
  segment public.customer_segment,
  subject text,
  offer text,
  status public.campaign_status,
  sent_at timestamptz,
  recipients bigint,
  opened bigint,
  returned bigint,
  return_rate numeric,
  revenue_14d numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, c.name, c.segment, c.subject, c.offer, c.status, c.sent_at,
         count(cs.id),
         count(cs.opened_at),
         count(cs.return_visit_id),
         case when count(cs.id) > 0 then round(count(cs.return_visit_id)::numeric / count(cs.id), 4) end,
         coalesce((
           select sum(s.total_amount)
           from public.campaign_sends cs2
           join public.sales s on s.customer_id = cs2.customer_id
           where cs2.campaign_id = c.id
             and s.occurred_at > coalesce(cs2.sent_at, c.sent_at)
             and s.occurred_at <= coalesce(cs2.sent_at, c.sent_at) + interval '14 days'
         ), 0)
  from public.campaigns c
  left join public.campaign_sends cs on cs.campaign_id = c.id
  where c.merchant_id = p_merchant_id
  group by c.id
  order by c.sent_at desc nulls first, c.created_at desc
$$;

-- Ajout d'un tampon (page Scanner). Règles :
-- * un seul tampon par client toutes les 2 heures (anti-abus) ;
-- * après N tampons, une récompense et la carte repart à zéro ;
-- * la visite est rattachée à la vente de caisse la plus proche à ± 5 minutes,
--   non encore rattachée, et de même montant si un montant est saisi.
-- security invoker : RLS garantit que le client appartient au commerçant.
create or replace function public.add_stamp(p_customer_id uuid, p_amount numeric default null, p_at timestamptz default null)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_at timestamptz := coalesce(p_at, now());
  v_card public.loyalty_cards;
  v_required int;
  v_last timestamptz;
  v_visit_id uuid;
  v_sale_id uuid;
  v_reward boolean := false;
begin
  if p_amount is not null and p_amount < 0 then
    raise exception 'montant invalide';
  end if;

  select * into v_card from public.loyalty_cards where customer_id = p_customer_id for update;
  if not found then
    -- Client inscrit sans carte (cas d'un import) : on la crée.
    insert into public.loyalty_cards (merchant_id, customer_id)
    select c.merchant_id, c.id from public.customers c where c.id = p_customer_id
    returning * into v_card;
    if not found then
      raise exception 'client introuvable';
    end if;
  end if;

  select max(v.visited_at) into v_last from public.visits v where v.customer_id = p_customer_id;
  if v_last is not null and v_last > v_at - interval '2 hours' then
    return jsonb_build_object(
      'status', 'too_soon',
      'next_allowed_at', v_last + interval '2 hours',
      'stamps', v_card.current_stamps
    );
  end if;

  select m.stamps_required into v_required from public.merchants m where m.id = v_card.merchant_id;

  select s.id into v_sale_id
  from public.sales s
  where s.merchant_id = v_card.merchant_id
    and s.customer_id is null
    and s.occurred_at between v_at - interval '5 minutes' and v_at + interval '5 minutes'
    and (p_amount is null or s.total_amount = p_amount)
    and not exists (select 1 from public.visits v where v.sale_id = s.id)
  order by abs(extract(epoch from s.occurred_at - v_at))
  limit 1;

  insert into public.visits (merchant_id, customer_id, visited_at, amount, sale_id, source)
  values (v_card.merchant_id, p_customer_id, v_at, p_amount, v_sale_id, 'scan')
  returning id into v_visit_id;

  if v_sale_id is not null then
    update public.sales set customer_id = p_customer_id where id = v_sale_id;
  end if;

  if v_card.current_stamps + 1 >= v_required then
    v_reward := true;
    update public.loyalty_cards
       set current_stamps = 0, rewards_earned = rewards_earned + 1, last_stamp_at = v_at
     where id = v_card.id
    returning * into v_card;
  else
    update public.loyalty_cards
       set current_stamps = current_stamps + 1, last_stamp_at = v_at
     where id = v_card.id
    returning * into v_card;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'visit_id', v_visit_id,
    'sale_id', v_sale_id,
    'stamps', v_card.current_stamps,
    'stamps_required', v_required,
    'reward', v_reward,
    'rewards_earned', v_card.rewards_earned
  );
end;
$$;

revoke execute on function public.review_summary(uuid) from public, anon;
revoke execute on function public.campaign_results(uuid) from public, anon;
revoke execute on function public.add_stamp(uuid, numeric, timestamptz) from public, anon;
grant execute on function public.review_summary(uuid) to authenticated, service_role;
grant execute on function public.campaign_results(uuid) to authenticated, service_role;
grant execute on function public.add_stamp(uuid, numeric, timestamptz) to authenticated, service_role;
