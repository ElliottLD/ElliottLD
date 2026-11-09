/**
 * Assemble les calculs pour un produit (spec pricing, § 4). Pur : les données
 * viennent de la base (pricing_products, pricing_weekly_sales), rien n'est
 * calculé par l'IA.
 */
import { estimateElasticity, type Confidence, type ElasticityResult, type WeeklySales } from "./elasticity";
import { computeMargin, isBelowMarginThreshold, weightedAverageMargin } from "./margin";
import { globalPriceIndex, priceIndex } from "./price-index";
import { estimateWeeklyImpact, recommendPrice, type Constraint } from "./recommend";

export type PricingProduct = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  unitCost: number;
  minMarginPct: number;
  competitorAvgPrice: number | null;
  competitorCount: number;
  revenue30d: number;
  lastPriceChangeAt: string | null;
};

export type PriceSuggestion = {
  recommendedPrice: number;
  targetPrice: number;
  elasticity: number;
  confidence: Confidence;
  weeklyQuantity: number;
  weeklyImpact: number;
  constraints: Constraint[];
};

export type ProductAnalysis = {
  product: PricingProduct;
  marginUnit: number;
  marginPct: number | null;
  belowThreshold: boolean;
  priceIndex: number | null;
  elasticity: ElasticityResult;
  status: "recommendation" | "insufficient_data" | "incoherent" | "no_change" | "cooldown";
  suggestion: PriceSuggestion | null;
};

/** Après un changement de prix, on attend des ventes au nouveau prix avant de reproposer. */
export const COOLDOWN_DAYS = 14;
/** Quantité hebdomadaire de référence : moyenne des dernières semaines complètes. */
export const REFERENCE_WEEKS = 4;

export function analyzeProduct(product: PricingProduct, weekly: WeeklySales[], now: Date = new Date()): ProductAnalysis {
  const margin = computeMargin(product.price, product.unitCost);
  const index = priceIndex(product.price, product.competitorAvgPrice);
  const elasticity = estimateElasticity(weekly);
  const base = {
    product,
    marginUnit: margin.unit,
    marginPct: margin.pct,
    belowThreshold: isBelowMarginThreshold(product.price, product.unitCost, product.minMarginPct),
    priceIndex: index,
    elasticity,
  };

  if (elasticity.status === "insufficient_data") return { ...base, status: "insufficient_data", suggestion: null };
  if (elasticity.status === "incoherent") return { ...base, status: "incoherent", suggestion: null };
  if (product.lastPriceChangeAt && now.getTime() - new Date(product.lastPriceChangeAt).getTime() < COOLDOWN_DAYS * 86_400_000) {
    return { ...base, status: "cooldown", suggestion: null };
  }

  const reco = recommendPrice({
    price: product.price,
    unitCost: product.unitCost,
    minMarginPct: product.minMarginPct,
    elasticity: elasticity.elasticity,
    priceIndex: index,
  });
  const recent = [...weekly].sort((a, b) => a.weekStart.localeCompare(b.weekStart)).slice(-REFERENCE_WEEKS);
  const weeklyQuantity = recent.reduce((s, w) => s + w.quantity, 0) / Math.max(1, recent.length);
  const { impact } = estimateWeeklyImpact({
    price: product.price,
    recommendedPrice: reco.recommendedPrice,
    unitCost: product.unitCost,
    elasticity: elasticity.elasticity,
    weeklyQuantity,
  });
  const suggestion: PriceSuggestion = {
    recommendedPrice: reco.recommendedPrice,
    targetPrice: reco.targetPrice,
    elasticity: elasticity.elasticity,
    confidence: elasticity.confidence,
    weeklyQuantity,
    weeklyImpact: impact,
    constraints: reco.constraints,
  };
  if (Math.abs(reco.recommendedPrice - product.price) < 0.005) return { ...base, status: "no_change", suggestion };
  return { ...base, status: "recommendation", suggestion };
}

/** Bandeau de 4 indicateurs de la page Prix. */
export function summarize(analyses: ProductAnalysis[]) {
  return {
    averageMarginPct: weightedAverageMargin(
      analyses.map((a) => ({ price: a.product.price, unitCost: a.product.unitCost, revenue: a.product.revenue30d })),
    ),
    globalPriceIndex: globalPriceIndex(analyses.map((a) => ({ index: a.priceIndex, revenue30d: a.product.revenue30d }))),
    belowThresholdCount: analyses.filter((a) => a.belowThreshold).length,
    potentialWeeklyGain: analyses.reduce(
      (s, a) => s + (a.status === "recommendation" && a.suggestion ? a.suggestion.weeklyImpact : 0),
      0,
    ),
  };
}
