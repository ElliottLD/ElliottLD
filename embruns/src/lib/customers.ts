import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SegmentKey } from "@/lib/segments";

/** Lecture des clients sous RLS ; les segments viennent de customer_segments (SQL). */

export type SegmentSummary = { segment: SegmentKey; customers: number; monthlySpend: number };

export async function getSegmentSummary(merchantId: string): Promise<SegmentSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("segment_summary", { p_merchant_id: merchantId });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    segment: r.segment as SegmentKey,
    customers: Number(r.customers),
    monthlySpend: Number(r.monthly_spend ?? 0),
  }));
}

export type CustomerRow = {
  id: string;
  firstName: string | null;
  segment: SegmentKey;
  visits90d: number;
  spend90d: number;
  lastVisitAt: string | null;
  daysSinceLastVisit: number | null;
  stamps: number | null;
};

export const PAGE_SIZE = 25;

export async function listCustomers(
  merchantId: string,
  { segment, search, page }: { segment: SegmentKey | null; search: string; page: number },
) {
  const supabase = await createClient();
  let query = supabase
    .rpc("customer_segments", { p_merchant_id: merchantId }, { count: "exact" })
    .select("customer_id, first_name, segment, visits_90d, spend_90d, last_visit_at, days_since_last_visit");
  if (segment) query = query.eq("segment", segment);
  if (search) query = query.ilike("first_name", `%${search.replace(/[%_\\]/g, "")}%`);
  const from = (page - 1) * PAGE_SIZE;
  const { data, error, count } = await query
    .order("spend_90d", { ascending: false })
    .order("customer_id")
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  const list = (Array.isArray(data) ? data : data ? [data] : []) as Record<string, unknown>[];

  const ids = list.map((r: Record<string, unknown>) => r.customer_id as string);
  const stamps = new Map<string, number>();
  if (ids.length) {
    const { data: cards, error: cardsError } = await supabase
      .from("loyalty_cards")
      .select("customer_id, current_stamps")
      .in("customer_id", ids);
    if (cardsError) throw cardsError;
    for (const c of cards ?? []) stamps.set(c.customer_id, c.current_stamps);
  }

  const rows: CustomerRow[] = list.map((r) => ({
    id: r.customer_id as string,
    firstName: (r.first_name as string | null) ?? null,
    segment: r.segment as SegmentKey,
    visits90d: Number(r.visits_90d),
    spend90d: Number(r.spend_90d),
    lastVisitAt: (r.last_visit_at as string | null) ?? null,
    daysSinceLastVisit: r.days_since_last_visit === null ? null : Number(r.days_since_last_visit),
    stamps: stamps.get(r.customer_id as string) ?? null,
  }));
  return { rows, total: count ?? rows.length };
}

export async function getCustomerDetail(merchantId: string, customerId: string) {
  const supabase = await createClient();
  const [customer, segment, card, visits, sales, sends] = await Promise.all([
    supabase
      .from("customers")
      .select("id, first_name, email, phone, birthday, marketing_consent, marketing_consent_at, unsubscribed_at, source, created_at")
      .eq("id", customerId)
      .maybeSingle(),
    supabase
      .rpc("customer_segments", { p_merchant_id: merchantId })
      .select("segment, visits_90d, spend_90d, median_interval_days, days_since_last_visit")
      .eq("customer_id", customerId)
      .maybeSingle(),
    supabase.from("loyalty_cards").select("current_stamps, rewards_earned, last_stamp_at").eq("customer_id", customerId).maybeSingle(),
    supabase
      .from("visits")
      .select("id, visited_at, amount", { count: "exact" })
      .eq("customer_id", customerId)
      .order("visited_at", { ascending: false })
      .limit(15),
    supabase.from("sales").select("total_amount").eq("customer_id", customerId),
    supabase
      .from("campaign_sends")
      .select("id, sent_at, opened_at, return_visit_id, campaigns(name)")
      .eq("customer_id", customerId)
      .order("sent_at", { ascending: false }),
  ]);
  for (const r of [customer, segment, card, visits, sales, sends]) if (r.error) throw r.error;
  if (!customer.data) return null;

  const totalSpend = (sales.data ?? []).reduce((sum, s) => sum + Number(s.total_amount), 0);
  const salesCount = (sales.data ?? []).length;
  return {
    customer: customer.data,
    segment: segment.data as
      | { segment: SegmentKey; visits_90d: number; spend_90d: number; median_interval_days: number | null; days_since_last_visit: number | null }
      | null,
    card: card.data,
    visits: visits.data ?? [],
    visitsTotal: visits.count ?? 0,
    totalSpend,
    avgBasket: salesCount ? totalSpend / salesCount : null,
    sends: (sends.data ?? []).map((s) => ({
      id: s.id,
      sentAt: s.sent_at,
      openedAt: s.opened_at,
      returned: Boolean(s.return_visit_id),
      campaign: (s.campaigns as unknown as { name: string } | null)?.name ?? "Campagne",
    })),
  };
}
