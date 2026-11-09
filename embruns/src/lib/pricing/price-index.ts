/** Indice de prix vs concurrents (spec pricing, § 4.2). Fonctions pures. */

/** 100 = aligné ; au-dessus = plus cher ; null sans prix concurrent récent. */
export function priceIndex(price: number, competitorAvgPrice: number | null): number | null {
  if (competitorAvgPrice === null || !(competitorAvgPrice > 0)) return null;
  return (price / competitorAvgPrice) * 100;
}

/** Indice global : moyenne des indices pondérée par le CA des 30 derniers jours. */
export function globalPriceIndex(items: { index: number | null; revenue30d: number }[]): number | null {
  let weight = 0;
  let sum = 0;
  for (const it of items) {
    if (it.index === null || !(it.revenue30d > 0)) continue;
    weight += it.revenue30d;
    sum += it.index * it.revenue30d;
  }
  return weight > 0 ? sum / weight : null;
}
