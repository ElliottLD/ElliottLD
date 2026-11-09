/**
 * Prix recommandé et impact estimé (spec pricing, § 4.4). Fonctions pures.
 *
 * Ordre des garde-fous : prix cible (marge totale maximale) → variation
 * limitée à ±10 % → plafond de hausse à +2 % si l'indice dépasse 115 →
 * plancher de marge minimale → arrondi psychologique dans les bornes.
 */
import { minimumPriceForMargin, round2 } from "./margin";

export const RECOMMENDATION_RULES = {
  maxChange: 0.1,
  inelasticIncrease: 0.05,
  highIndex: 115,
  highIndexMaxIncrease: 0.02,
} as const;

export type Constraint = "max_change" | "high_index_cap" | "margin_floor" | "margin_floor_unreachable";

export type PriceRecommendation = {
  /** Prix visé avant garde-fous. */
  targetPrice: number;
  recommendedPrice: number;
  constraints: Constraint[];
};

export function recommendPrice(input: {
  price: number;
  unitCost: number;
  minMarginPct: number;
  /** Élasticité bornée (négative). */
  elasticity: number;
  priceIndex: number | null;
}): PriceRecommendation {
  const { price, unitCost, minMarginPct, elasticity: e, priceIndex } = input;
  const R = RECOMMENDATION_RULES;
  const constraints: Constraint[] = [];

  // 1. Prix cible.
  const targetPrice = e < -1 ? (unitCost * e) / (1 + e) : price * (1 + R.inelasticIncrease);

  // 2. Bornes autorisées : ±10 %, plafond de hausse si l'indice dépasse 115.
  const absoluteLo = price * (1 - R.maxChange);
  const absoluteHi = price * (1 + R.maxChange);
  let hi = absoluteHi;
  if (targetPrice < absoluteLo || targetPrice > absoluteHi) constraints.push("max_change");
  if (priceIndex !== null && priceIndex > R.highIndex) {
    const cap = price * (1 + R.highIndexMaxIncrease);
    if (targetPrice > cap) constraints.push("high_index_cap");
    hi = Math.min(hi, cap);
  }

  // 3. Plancher de marge minimale : jamais en dessous, sauf s'il dépasse +10 %
  //    (la limite de ±10 % reste absolue) ; il l'emporte sur le plafond d'indice.
  const floor = Math.ceil(minimumPriceForMargin(unitCost, minMarginPct) * 100 - 1e-9) / 100;
  let lo = Math.max(absoluteLo, floor);
  if (floor > absoluteLo && targetPrice < floor) constraints.push("margin_floor");
  if (lo > hi) {
    if (floor <= absoluteHi) {
      hi = floor;
    } else {
      constraints.push("margin_floor_unreachable");
      hi = absoluteHi;
      lo = absoluteHi;
    }
  }

  const bounded = Math.min(hi, Math.max(lo, targetPrice));
  return { targetPrice: round2(targetPrice), recommendedPrice: psychologicalPrice(bounded, lo, hi), constraints };
}

/**
 * Arrondi psychologique, selon l'ordre de grandeur :
 * - moins de 5 € : terminaison en ,x9 (1,39 ; 2,49 ; 3,99) ;
 * - de 5 à 20 € : ,49 ou ,99 ;
 * - 20 € et plus : ,90.
 * On prend le candidat le plus proche qui reste dans [lo, hi] ; s'il n'y en a
 * pas, le prix borné est arrondi au centime.
 */
export function psychologicalPrice(value: number, lo = -Infinity, hi = Infinity): number {
  const candidates = psychologicalCandidates(value);
  const eps = 1e-9;
  const inside = candidates.filter((c) => c >= lo - eps && c <= hi + eps);
  if (inside.length === 0) return round2(Math.min(hi, Math.max(lo, value)));
  return inside.reduce((best, c) => (Math.abs(c - value) < Math.abs(best - value) ? c : best));
}

function psychologicalCandidates(value: number): number[] {
  const out: number[] = [];
  const base = Math.floor(value);
  for (let n = base - 1; n <= base + 1; n++) {
    if (n < 0) continue;
    if (value < 5) for (let d = 0; d < 10; d++) out.push(round2(n + d / 10 + 0.09));
    else if (value < 20) out.push(round2(n + 0.49), round2(n + 0.99));
    else out.push(round2(n + 0.9));
  }
  return out.filter((c) => c > 0);
}

/**
 * Impact hebdomadaire estimé sur la marge :
 * Δ = (p* − c) × q(p*) − (p − c) × q(p), avec q(p*) = q(p) × (p* ÷ p)^e.
 */
export function estimateWeeklyImpact(input: {
  price: number;
  recommendedPrice: number;
  unitCost: number;
  elasticity: number;
  weeklyQuantity: number;
}): { impact: number; newWeeklyQuantity: number } {
  const { price, recommendedPrice, unitCost, elasticity, weeklyQuantity } = input;
  if (!(price > 0)) return { impact: 0, newWeeklyQuantity: weeklyQuantity };
  const newWeeklyQuantity = weeklyQuantity * (recommendedPrice / price) ** elasticity;
  const impact = (recommendedPrice - unitCost) * newWeeklyQuantity - (price - unitCost) * weeklyQuantity;
  return { impact: round2(impact), newWeeklyQuantity };
}
