import { describe, expect, it } from "vitest";
import { estimateElasticity, type WeeklySales } from "./elasticity";
import { computeMargin, isBelowMarginThreshold, weightedAverageMargin } from "./margin";
import { globalPriceIndex, priceIndex } from "./price-index";
import { estimateWeeklyImpact, psychologicalPrice, recommendPrice } from "./recommend";

describe("marges", () => {
  it("marge unitaire et en %", () => {
    expect(computeMargin(1.4, 0.38)).toEqual({ unit: 1.02, pct: expect.closeTo(72.857, 2) });
    expect(computeMargin(8.9, 6.7).pct).toBeCloseTo(24.72, 2);
  });

  it("prix nul : pas de division par zéro, marge en % inconnue, alerte", () => {
    expect(computeMargin(0, 1)).toEqual({ unit: -1, pct: null });
    expect(isBelowMarginThreshold(0, 1, 30)).toBe(true);
  });

  it("alerte sous le seuil", () => {
    expect(isBelowMarginThreshold(8.9, 6.7, 30)).toBe(true);
    expect(isBelowMarginThreshold(1.4, 0.38, 30)).toBe(false);
    expect(isBelowMarginThreshold(10, 7, 30)).toBe(false); // exactement 30 % : pas d'alerte
  });

  it("marge moyenne pondérée par le CA", () => {
    // 50 % de marge sur 100 € de CA, 20 % sur 300 € → 27,5 %.
    expect(weightedAverageMargin([
      { price: 2, unitCost: 1, revenue: 100 },
      { price: 10, unitCost: 8, revenue: 300 },
      { price: 0, unitCost: 1, revenue: 50 },
    ])).toBeCloseTo(27.5, 6);
    expect(weightedAverageMargin([])).toBeNull();
  });
});

describe("indice de prix", () => {
  it("par produit : 100 = aligné, sans concurrent = null", () => {
    expect(priceIndex(1.4, 1.4)).toBe(100);
    expect(priceIndex(4.5, 3.6)).toBeCloseTo(125, 6);
    expect(priceIndex(1.4, null)).toBeNull();
  });

  it("plusieurs concurrents : la moyenne est faite en amont (dernier relevé de chacun)", () => {
    expect(priceIndex(2, (1.8 + 2.2) / 2)).toBe(100);
  });

  it("global : pondéré par le CA, produits sans concurrent exclus", () => {
    expect(globalPriceIndex([
      { index: 100, revenue30d: 300 },
      { index: 120, revenue30d: 100 },
      { index: null, revenue30d: 1000 },
    ])).toBe(105);
    expect(globalPriceIndex([{ index: null, revenue30d: 10 }])).toBeNull();
  });
});

/** Ventes synthétiques générées avec une élasticité connue, bruit déterministe. */
function synthetic(e: number, weeks: number, prices: number[], noise = 0.03): WeeklySales[] {
  return Array.from({ length: weeks }, (_, i) => {
    const p = prices[i % prices.length];
    const q = 500 * p ** e * (1 + noise * Math.sin(i * 12.9898));
    return { weekStart: `2026-01-${String(i + 1).padStart(2, "0")}`, quantity: q, revenue: q * p };
  });
}

describe("élasticité", () => {
  it("retrouve environ -1,5 sur des données générées avec e = -1,5", () => {
    const r = estimateElasticity(synthetic(-1.5, 16, [2.0, 2.2, 1.9, 2.1]));
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.rawElasticity).toBeCloseTo(-1.5, 1);
    expect(r.confidence).toBe("high");
  });

  it("données insuffisantes : moins de 8 semaines", () => {
    expect(estimateElasticity(synthetic(-1, 7, [2, 2.2]))).toEqual({ status: "insufficient_data", reason: "too_few_weeks", weeks: 7 });
  });

  it("données insuffisantes : un seul prix (ou écart < 3 %)", () => {
    expect(estimateElasticity(synthetic(-1, 16, [2]))).toMatchObject({ status: "insufficient_data", reason: "single_price" });
    expect(estimateElasticity(synthetic(-1, 16, [2, 2.05]))).toMatchObject({ status: "insufficient_data", reason: "single_price" });
  });

  it("élasticité positive : incohérente, pas de recommandation", () => {
    expect(estimateElasticity(synthetic(0.8, 12, [2, 2.4])).status).toBe("incoherent");
  });

  it("bornée entre -5 et -0,1", () => {
    const steep = estimateElasticity(synthetic(-7, 12, [2, 2.4]));
    const flat = estimateElasticity(synthetic(-0.02, 12, [2, 2.4], 0));
    expect(steep.status === "ok" && steep.elasticity).toBe(-5);
    expect(flat.status === "ok" && flat.elasticity).toBe(-0.1);
  });

  it("confiance moyenne puis faible quand le bruit augmente", () => {
    const medium = estimateElasticity(synthetic(-0.5, 16, [2, 2.2], 0.04));
    const low = estimateElasticity(synthetic(-0.3, 16, [2, 2.1], 0.2));
    expect(medium.status === "ok" && medium.confidence).toBe("medium");
    expect(low.status === "ok" && low.confidence).toBe("low");
  });
});

describe("prix recommandé et garde-fous", () => {
  const base = { unitCost: 0.4, minMarginPct: 30, priceIndex: 100 };

  it("demande peu élastique : +5 %, puis arrondi psychologique", () => {
    const r = recommendPrice({ ...base, price: 1.3, elasticity: -0.4 });
    expect(r.targetPrice).toBeCloseTo(1.37, 2);
    expect(r.recommendedPrice).toBe(1.39);
    expect(r.constraints).toEqual([]);
  });

  it("demande élastique : p* = c × e / (1 + e), limité à ±10 %", () => {
    // c = 1, e = -1,5 → p* = 3 ; prix actuel 2 → plafonné à 2,20 puis arrondi dans les bornes.
    const r = recommendPrice({ price: 2, unitCost: 1, minMarginPct: 30, elasticity: -1.5, priceIndex: 100 });
    expect(r.targetPrice).toBe(3);
    expect(r.recommendedPrice).toBeLessThanOrEqual(2.2);
    expect(r.recommendedPrice).toBe(2.19);
    expect(r.constraints).toContain("max_change");
  });

  it("baisse limitée à -10 %", () => {
    // c = 0,5, e = -3 → p* = 0,75 ; prix actuel 1,50 → pas en dessous de 1,35.
    const r = recommendPrice({ price: 1.5, unitCost: 0.5, minMarginPct: 30, elasticity: -3, priceIndex: 100 });
    expect(r.recommendedPrice).toBeGreaterThanOrEqual(1.35);
    expect(r.recommendedPrice).toBe(1.39);
  });

  it("jamais sous le prix de marge minimale, coût / (1 − seuil)", () => {
    // c = 1,2, seuil 30 % → plancher 1,72 (1,2 / 0,7 = 1,714…) ; e = -4 → p* = 1,60, prix actuel 1,65.
    const r = recommendPrice({ price: 1.65, unitCost: 1.2, minMarginPct: 30, elasticity: -4, priceIndex: 100 });
    expect(r.recommendedPrice).toBeGreaterThanOrEqual(1.72);
    expect(r.constraints).toContain("margin_floor");
    // Au prix recommandé, la marge atteint bien le seuil.
    expect((r.recommendedPrice - 1.2) / r.recommendedPrice).toBeGreaterThanOrEqual(0.3);
  });

  it("plancher de marge au-delà de +10 % : +10 % au maximum, signalé", () => {
    const r = recommendPrice({ price: 8.9, unitCost: 8, minMarginPct: 30, elasticity: -0.5, priceIndex: 100 });
    expect(r.recommendedPrice).toBeLessThanOrEqual(9.79);
    expect(r.constraints).toContain("margin_floor_unreachable");
  });

  it("indice > 115 : hausse plafonnée à +2 %", () => {
    const r = recommendPrice({ ...base, price: 4.5, unitCost: 1.4, elasticity: -0.5, priceIndex: 125 });
    expect(r.recommendedPrice).toBeLessThanOrEqual(4.59);
    expect(r.constraints).toContain("high_index_cap");
  });

  it("indice > 115 mais marge insuffisante : le plancher de marge l'emporte sur le plafond de +2 %", () => {
    // c = 1,45 → plancher 2,08 ; plafond d'indice 2,04 ; limite +10 % 2,20.
    const r = recommendPrice({ price: 2, unitCost: 1.45, minMarginPct: 30, elasticity: -0.5, priceIndex: 130 });
    expect(r.recommendedPrice).toBeGreaterThanOrEqual(2.08);
    expect(r.recommendedPrice).toBeLessThanOrEqual(2.2);
  });

  it("arrondi psychologique selon l'ordre de grandeur", () => {
    expect(psychologicalPrice(1.36)).toBe(1.39);
    expect(psychologicalPrice(3.96)).toBe(3.99);
    expect(psychologicalPrice(6.3)).toBe(6.49);
    expect(psychologicalPrice(9.2)).toBe(8.99);
    expect(psychologicalPrice(23.6)).toBe(23.9);
    // Aucun candidat dans les bornes : prix borné arrondi au centime.
    expect(psychologicalPrice(1.31, 1.3, 1.32)).toBe(1.31);
    // Arrondi vers l'intérieur : jamais au-delà de la borne haute.
    expect(psychologicalPrice(6.039, 6.039, 6.039)).toBe(6.03);
  });
});

describe("impact estimé", () => {
  it("Δ = (p* − c) × q(p*) − (p − c) × q(p)", () => {
    // p = 2, p* = 2,2, c = 1, e = -1, q = 100 → q(p*) = 90,909… → 1,2 × 90,909 − 1 × 100 = 9,09.
    const r = estimateWeeklyImpact({ price: 2, recommendedPrice: 2.2, unitCost: 1, elasticity: -1, weeklyQuantity: 100 });
    expect(r.impact).toBeCloseTo(9.09, 2);
    expect(r.newWeeklyQuantity).toBeCloseTo(90.909, 2);
  });

  it("prix actuel nul : impact nul, pas de plantage", () => {
    expect(estimateWeeklyImpact({ price: 0, recommendedPrice: 1, unitCost: 1, elasticity: -1, weeklyQuantity: 10 }).impact).toBe(0);
  });
});
