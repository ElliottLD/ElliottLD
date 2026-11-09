/**
 * Élasticité-prix estimée sur l'historique de ventes (spec pricing, § 4.3).
 * Régression log-log par moindres carrés : ln(q) = a + e × ln(p).
 */

export type WeeklySales = { weekStart: string; quantity: number; revenue: number };

export const ELASTICITY_RULES = {
  minWeeks: 8,
  /** Écart minimal entre le prix le plus bas et le plus haut observés. */
  minPriceSpread: 0.03,
  bounds: { min: -5, max: -0.1 },
  confidence: { highR2: 0.5, highWeeks: 12, mediumR2: 0.25 },
} as const;

export type Confidence = "high" | "medium" | "low";

export type ElasticityResult =
  | {
      status: "ok";
      /** Coefficient brut de la régression. */
      rawElasticity: number;
      /** Coefficient borné entre -5 et -0,1, utilisé pour la recommandation. */
      elasticity: number;
      intercept: number;
      r2: number;
      weeks: number;
      confidence: Confidence;
    }
  | { status: "insufficient_data"; reason: "too_few_weeks" | "single_price"; weeks: number }
  | { status: "incoherent"; rawElasticity: number; r2: number; weeks: number };

export function estimateElasticity(weekly: WeeklySales[]): ElasticityResult {
  const points = weekly
    .filter((w) => w.quantity > 0 && w.revenue > 0)
    .map((w) => ({ x: Math.log(w.revenue / w.quantity), y: Math.log(w.quantity) }));
  const weeks = points.length;
  if (weeks < ELASTICITY_RULES.minWeeks) return { status: "insufficient_data", reason: "too_few_weeks", weeks };

  const prices = points.map((p) => Math.exp(p.x));
  if (Math.max(...prices) / Math.min(...prices) - 1 < ELASTICITY_RULES.minPriceSpread) {
    return { status: "insufficient_data", reason: "single_price", weeks };
  }

  const meanX = points.reduce((s, p) => s + p.x, 0) / weeks;
  const meanY = points.reduce((s, p) => s + p.y, 0) / weeks;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const p of points) {
    sxy += (p.x - meanX) * (p.y - meanY);
    sxx += (p.x - meanX) ** 2;
    syy += (p.y - meanY) ** 2;
  }
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const r2 = syy > 0 ? (sxy * sxy) / (sxx * syy) : 0;

  if (slope > 0) return { status: "incoherent", rawElasticity: slope, r2, weeks };

  const { bounds, confidence: c } = ELASTICITY_RULES;
  const elasticity = Math.min(bounds.max, Math.max(bounds.min, slope));
  const confidence: Confidence = r2 >= c.highR2 && weeks >= c.highWeeks ? "high" : r2 >= c.mediumR2 ? "medium" : "low";
  return { status: "ok", rawElasticity: slope, elasticity, intercept, r2, weeks, confidence };
}
