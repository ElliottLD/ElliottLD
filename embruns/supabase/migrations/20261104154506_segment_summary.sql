-- Comptes par segment (section 4.3 : « Clients à risque : nombre et CA
-- mensuel associé »), calculés à partir de customer_segments.
create or replace function public.segment_summary(p_merchant_id uuid, p_as_of date default null)
returns table (segment text, customers bigint, monthly_spend numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.segment, count(*), round(sum(s.spend_90d) / 3, 2)
  from public.customer_segments(p_merchant_id, p_as_of) s
  group by s.segment
  order by s.segment
$$;

revoke execute on function public.segment_summary(uuid, date) from public, anon;
grant execute on function public.segment_summary(uuid, date) to authenticated, service_role;
