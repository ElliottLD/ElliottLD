import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { WeeklySales } from "./elasticity";
import { analyzeProduct, type PricingProduct, type ProductAnalysis } from "./engine";
import { buildExplanationFacts } from "./explain";
import { explainRecommendation } from "./explain-ai";

export const HISTORY_WEEKS = 16;

export type StoredRecommendation = {
  id: string;
  productId: string;
  currentPrice: number;
  recommendedPrice: number;
  explanation: string;
  explanationSource: "ai" | "template";
  status: "proposed" | "accepted" | "ignored";
  createdAt: string;
};

export type ProductRow = ProductAnalysis & { recommendation: StoredRecommendation | null; weekly: WeeklySales[] };

const toNumber = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/** Charge les produits suivis et leur historique hebdomadaire, puis calcule tout (code pur). */
export async function loadPricing(merchantId: string): Promise<ProductRow[]> {
  const supabase = await createClient();
  const [products, weekly, recos] = await Promise.all([
    supabase.rpc("pricing_products", { p_merchant_id: merchantId }),
    supabase.rpc("pricing_weekly_sales", { p_merchant_id: merchantId, p_weeks: HISTORY_WEEKS }),
    supabase
      .from("price_recommendations")
      .select("id, product_id, current_price, recommended_price, explanation, explanation_source, status, created_at")
      .eq("merchant_id", merchantId)
      .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString())
      .order("created_at", { ascending: false }),
  ]);
  for (const r of [products, weekly, recos]) if (r.error) throw r.error;

  const byProduct = new Map<string, WeeklySales[]>();
  for (const w of (weekly.data ?? []) as Record<string, unknown>[]) {
    const id = String(w.product_id);
    const list = byProduct.get(id) ?? [];
    list.push({ weekStart: String(w.week_start), quantity: Number(w.quantity), revenue: Number(w.revenue) });
    byProduct.set(id, list);
  }
  const stored = ((recos.data ?? []) as Record<string, unknown>[]).map(
    (r): StoredRecommendation => ({
      id: String(r.id),
      productId: String(r.product_id),
      currentPrice: Number(r.current_price),
      recommendedPrice: Number(r.recommended_price),
      explanation: String(r.explanation),
      explanationSource: r.explanation_source as "ai" | "template",
      status: r.status as StoredRecommendation["status"],
      createdAt: String(r.created_at),
    }),
  );

  return ((products.data ?? []) as Record<string, unknown>[]).map((r) => {
    const product: PricingProduct = {
      id: String(r.product_id),
      name: String(r.name),
      category: (r.category as string | null) ?? null,
      price: Number(r.price),
      unitCost: Number(r.unit_cost),
      minMarginPct: Number(r.min_margin_pct),
      competitorAvgPrice: toNumber(r.competitor_avg_price),
      competitorCount: Number(r.competitor_count),
      revenue30d: Number(r.revenue_30d),
      lastPriceChangeAt: (r.last_price_change_at as string | null) ?? null,
    };
    const weeklySales = byProduct.get(product.id) ?? [];
    const analysis = analyzeProduct(product, weeklySales);
    return { ...analysis, weekly: weeklySales, recommendation: matchingRecommendation(analysis, stored) };
  });
}

/** Recommandation enregistrée cette semaine pour le même prix actuel et le même prix conseillé. */
function matchingRecommendation(a: ProductAnalysis, stored: StoredRecommendation[]): StoredRecommendation | null {
  if (a.status !== "recommendation" || !a.suggestion) return null;
  const s = a.suggestion;
  return (
    stored.find(
      (r) =>
        r.productId === a.product.id &&
        Math.abs(r.currentPrice - a.product.price) < 0.005 &&
        Math.abs(r.recommendedPrice - s.recommendedPrice) < 0.005,
    ) ?? null
  );
}

/**
 * Enregistre les recommandations manquantes (au plus une par produit, par
 * prix et par semaine), avec leur explication. Les chiffres viennent du
 * calcul ; l'IA ne fait que les formuler.
 */
export async function syncRecommendations(merchantId: string, rows: ProductRow[]): Promise<ProductRow[]> {
  const missing = rows.filter((r) => r.status === "recommendation" && r.suggestion && !r.recommendation);
  if (missing.length === 0) return rows;
  const supabase = await createClient();

  const created = await Promise.all(
    missing.map(async (r) => {
      const facts = buildExplanationFacts(r);
      if (!facts || !r.suggestion) return null;
      const { text, source } = await explainRecommendation(facts);
      const { data, error } = await supabase
        .from("price_recommendations")
        .insert({
          merchant_id: merchantId,
          product_id: r.product.id,
          current_price: r.product.price,
          recommended_price: r.suggestion.recommendedPrice,
          elasticity: Number(r.suggestion.elasticity.toFixed(3)),
          confidence: r.suggestion.confidence,
          estimated_weekly_impact: r.suggestion.weeklyImpact,
          price_index: r.priceIndex === null ? null : Number(r.priceIndex.toFixed(1)),
          explanation: text,
          explanation_source: source,
        })
        .select("id, created_at")
        .single();
      if (error) throw error;
      return {
        productId: r.product.id,
        reco: {
          id: data.id,
          productId: r.product.id,
          currentPrice: r.product.price,
          recommendedPrice: r.suggestion.recommendedPrice,
          explanation: text,
          explanationSource: source,
          status: "proposed" as const,
          createdAt: data.created_at,
        },
      };
    }),
  );
  const byProduct = new Map(created.filter((c) => c !== null).map((c) => [c!.productId, c!.reco]));
  return rows.map((r) => (byProduct.has(r.product.id) ? { ...r, recommendation: byProduct.get(r.product.id)! } : r));
}

export async function loadPricingWithRecommendations(merchantId: string) {
  return syncRecommendations(merchantId, await loadPricing(merchantId));
}

export async function loadCompetitorPrices(productId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competitor_prices")
    .select("id, competitor_name, price, observed_at")
    .eq("product_id", productId)
    .order("observed_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function loadPriceChanges(productId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_price_changes")
    .select("id, old_price, new_price, source, changed_at")
    .eq("product_id", productId)
    .order("changed_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}
