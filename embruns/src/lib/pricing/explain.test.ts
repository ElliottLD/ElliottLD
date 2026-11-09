import { describe, expect, it } from "vitest";
import type { ProductAnalysis } from "./engine";
import { buildExplanationFacts, extractNumbers, isValidExplanation, templateExplanation } from "./explain";

const analysis = (over: Partial<ProductAnalysis["suggestion"]> = {}, index: number | null = 100, belowThreshold = false): ProductAnalysis => ({
  product: { id: "p", name: "Baguette tradition", category: "pains", price: 1.29, unitCost: 0.38, minMarginPct: 30, competitorAvgPrice: 1.3, competitorCount: 2, revenue30d: 4000, lastPriceChangeAt: null },
  marginUnit: 0.91,
  marginPct: 70.5,
  belowThreshold,
  priceIndex: index,
  elasticity: { status: "ok", rawElasticity: -0.4, elasticity: -0.4, intercept: 1, r2: 0.6, weeks: 16, confidence: "high" },
  status: "recommendation",
  suggestion: { recommendedPrice: 1.39, targetPrice: 1.35, elasticity: -0.4, confidence: "high", weeklyQuantity: 800, weeklyImpact: 18.4, constraints: [], ...over },
});

describe("explication des recommandations", () => {
  it("faits déjà mis en forme, sans jargon", () => {
    const f = buildExplanationFacts(analysis())!;
    expect(f.prix_actuel).toMatch(/^1,29\s€$/);
    expect(f.prix_recommande).toMatch(/^1,39\s€$/);
    expect(f.variation).toBe("8 %");
    expect(f.gain_marge_par_semaine).toBe("18 €");
    expect(f.sensibilite_au_prix).toBe("faible");
    expect(f.position_concurrents).toBe("aligné");
  });

  it("la phrase de repli reprend uniquement les chiffres calculés", () => {
    const f = buildExplanationFacts(analysis())!;
    const text = templateExplanation(f);
    expect(text).toContain("1,29");
    expect(text).toContain("1,39");
    expect(text).toContain("18 €");
    expect(isValidExplanation(text, f)).toBe(true);
  });

  it("variantes : produit sensible, plafond d'indice, marge sous le seuil, faible fiabilité", () => {
    for (const a of [
      analysis({ elasticity: -1.8, recommendedPrice: 1.19, weeklyImpact: 3.2 }, 92),
      analysis({ constraints: ["high_index_cap"] }, 125),
      analysis({}, 100, true),
      analysis({ confidence: "low" }, null),
    ]) {
      const f = buildExplanationFacts(a)!;
      expect(isValidExplanation(templateExplanation(f), f)).toBe(true);
    }
  });

  it("rejette un texte qui invente ou modifie un chiffre", () => {
    const f = buildExplanationFacts(analysis())!;
    expect(isValidExplanation("Vos clients réagissent peu au prix : passez de 1,29 € à 1,39 € pour gagner 18 € par semaine.", f)).toBe(true);
    expect(isValidExplanation("Vos clients réagissent peu au prix : passez de 1,29 € à 1,45 € pour gagner 18 € par semaine.", f)).toBe(false);
    expect(isValidExplanation("Vos clients réagissent peu au prix : vous gagneriez 25 € par semaine.", f)).toBe(false);
    expect(isValidExplanation("Votre élasticité est faible, passez de 1,29 € à 1,39 €.", f)).toBe(false);
  });

  it("extrait les nombres au format français", () => {
    expect(extractNumbers("de 1,29 € à 1 234,50 € soit 8 %")).toEqual([1.29, 1234.5, 8]);
  });
});
