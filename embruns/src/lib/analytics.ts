import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Lecture des KPI calculés en SQL (fonctions kpi_summary, sales_by_day,
 * sales_by_slot, top_products), sous RLS. Aucun calcul de KPI ici : on ne
 * fait que convertir les types.
 */

export type KpiPeriod = {
  period: "current" | "previous";
  periodStart: string;
  periodEnd: string;
  revenue: number;
  tickets: number;
  avgBasket: number | null;
  identifiedRevenue: number;
  identifiedShare: number | null;
  newCustomers: number;
  returnRate30d: number | null;
  activeCustomers: number;
  visits: number;
  visitFrequency: number | null;
};

const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function getKpiSummary(merchantId: string, start: string, end: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("kpi_summary", { p_merchant_id: merchantId, p_start: start, p_end: end });
  if (error) throw error;
  const rows = (data ?? []).map(
    (r: Record<string, unknown>): KpiPeriod => ({
      period: r.period as KpiPeriod["period"],
      periodStart: String(r.period_start),
      periodEnd: String(r.period_end),
      revenue: Number(r.revenue),
      tickets: Number(r.tickets),
      avgBasket: n(r.avg_basket),
      identifiedRevenue: Number(r.identified_revenue),
      identifiedShare: n(r.identified_share),
      newCustomers: Number(r.new_customers),
      returnRate30d: n(r.return_rate_30d),
      activeCustomers: Number(r.active_customers),
      visits: Number(r.visits),
      visitFrequency: n(r.visit_frequency),
    }),
  );
  const current = rows.find((r: KpiPeriod) => r.period === "current");
  const previous = rows.find((r: KpiPeriod) => r.period === "previous");
  if (!current || !previous) throw new Error("kpi_summary : réponse incomplète");
  return { current, previous };
}

export type DayPoint = { day: string; revenue: number; tickets: number; identifiedRevenue: number };

export async function getSalesByDay(merchantId: string, start: string, end: string): Promise<DayPoint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sales_by_day", { p_merchant_id: merchantId, p_start: start, p_end: end });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    day: String(r.day),
    revenue: Number(r.revenue),
    tickets: Number(r.tickets),
    identifiedRevenue: Number(r.identified_revenue),
  }));
}

export type SlotCell = { isodow: number; hour: number; revenue: number; tickets: number };

export async function getSalesBySlot(merchantId: string, start: string, end: string): Promise<SlotCell[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sales_by_slot", { p_merchant_id: merchantId, p_start: start, p_end: end });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    isodow: Number(r.isodow),
    hour: Number(r.hour),
    revenue: Number(r.revenue),
    tickets: Number(r.tickets),
  }));
}

export type ProductRow = {
  name: string;
  category: string | null;
  revenue: number;
  quantity: number;
  previousRevenue: number;
  previousQuantity: number;
  rankRevenue: number;
  rankQuantity: number;
};

export async function getTopProducts(merchantId: string, start: string, end: string, limit = 10): Promise<ProductRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("top_products", {
    p_merchant_id: merchantId,
    p_start: start,
    p_end: end,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    name: String(r.product_name),
    category: (r.category as string | null) ?? null,
    revenue: Number(r.revenue),
    quantity: Number(r.quantity),
    previousRevenue: Number(r.previous_revenue),
    previousQuantity: Number(r.previous_quantity),
    rankRevenue: Number(r.rank_revenue),
    rankQuantity: Number(r.rank_quantity),
  }));
}
