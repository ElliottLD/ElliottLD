/** Marges par produit (spec pricing, § 4.1). Fonctions pures. */

export type Margin = {
  /** Marge unitaire en euros : prix - coût. */
  unit: number;
  /** Marge en % du prix de vente, ou null si le prix est nul. */
  pct: number | null;
};

export function computeMargin(price: number, unitCost: number): Margin {
  const unit = round2(price - unitCost);
  return { unit, pct: price > 0 ? ((price - unitCost) / price) * 100 : null };
}

/** Alerte quand la marge passe sous le seuil (un prix nul est toujours en alerte). */
export function isBelowMarginThreshold(price: number, unitCost: number, minMarginPct: number): boolean {
  const { pct } = computeMargin(price, unitCost);
  return pct === null || pct < minMarginPct;
}

/**
 * Prix minimal qui respecte le seuil de marge.
 *
 * Écart assumé avec la spec (« coût × (1 + seuil) ») : cette formule est un
 * taux de marque sur le coût, alors que le seuil d'alerte porte sur la marge
 * en % du prix. Avec coût × (1 + 30 %), un produit resterait sous 30 % de
 * marge. On retient donc coût / (1 − seuil), cohérent avec l'alerte.
 */
export function minimumPriceForMargin(unitCost: number, minMarginPct: number): number {
  if (minMarginPct >= 100) return Infinity;
  return unitCost / (1 - minMarginPct / 100);
}

/** Marge moyenne en %, pondérée par le chiffre d'affaires (produits vendus seulement). */
export function weightedAverageMargin(items: { price: number; unitCost: number; revenue: number }[]): number | null {
  let weight = 0;
  let sum = 0;
  for (const it of items) {
    const { pct } = computeMargin(it.price, it.unitCost);
    if (pct === null || it.revenue <= 0) continue;
    weight += it.revenue;
    sum += pct * it.revenue;
  }
  return weight > 0 ? sum / weight : null;
}

export function round2(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}
