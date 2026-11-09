import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_PARAMS } from "../../src/lib/demo/params";
import { analyzeProduct, summarize, type PricingProduct, type ProductAnalysis } from "../../src/lib/pricing/engine";
import type { WeeklySales } from "../../src/lib/pricing/elasticity";
import { createTestDb, type TestDb } from "./test-db";

/**
 * Test d'intégration du module Pricing (spec, § 8) : seed de démo → fonctions
 * SQL → calculs → recommandations attendues.
 */

/** Date fixe : génération et calculs reproductibles. */
const TODAY = "2026-11-04";

let db: TestDb;
let merchantId: string;
let analyses: Map<string, ProductAnalysis>;

async function loadAnalyses() {
  const products = (await db.client.query("select * from pricing_products($1, $2)", [merchantId, TODAY])).rows;
  const weekly = (await db.client.query("select product_id, week_start::text, quantity, revenue from pricing_weekly_sales($1, 16, $2)", [merchantId, TODAY])).rows;
  const byProduct = new Map<string, WeeklySales[]>();
  for (const w of weekly) {
    const list = byProduct.get(w.product_id) ?? [];
    list.push({ weekStart: w.week_start, quantity: Number(w.quantity), revenue: Number(w.revenue) });
    byProduct.set(w.product_id, list);
  }
  const result = new Map<string, ProductAnalysis>();
  for (const r of products) {
    const product: PricingProduct = {
      id: r.product_id,
      name: r.name,
      category: r.category,
      price: Number(r.price),
      unitCost: Number(r.unit_cost),
      minMarginPct: Number(r.min_margin_pct),
      competitorAvgPrice: r.competitor_avg_price === null ? null : Number(r.competitor_avg_price),
      competitorCount: Number(r.competitor_count),
      revenue30d: Number(r.revenue_30d),
      lastPriceChangeAt: r.last_price_change_at,
    };
    result.set(product.name, analyzeProduct(product, byProduct.get(product.id) ?? [], new Date(`${TODAY}T12:00:00Z`)));
  }
  return result;
}

beforeAll(async () => {
  db = await createTestDb();
  const user = (await db.client.query("insert into auth.users (email) values ('demo@example.com') returning id")).rows[0].id;
  merchantId = (await db.client.query("insert into merchants (owner_id, name, is_demo) values ($1, 'Au Pain Doré', true) returning id", [user])).rows[0].id;
  await db.client.query("select public.generate_demo($1, $2, $3)", [merchantId, JSON.stringify(DEMO_PARAMS), TODAY]);
  analyses = await loadAnalyses();
}, 180_000);

afterAll(async () => {
  await db?.destroy();
});

describe("seed de démo pricing", () => {
  it("14 produits suivis, relançable sans doublon", async () => {
    expect(analyses.size).toBe(14);
    await db.client.query("select public.generate_demo($1, $2, $3)", [merchantId, JSON.stringify(DEMO_PARAMS), TODAY]);
    const n = (await db.client.query("select count(*)::int as n from products where merchant_id = $1", [merchantId])).rows[0].n;
    expect(n).toBe(14);
    analyses = await loadAnalyses();
  }, 120_000);

  it("16 semaines d'historique pour chaque produit", async () => {
    const rows = (await db.client.query("select product_id, count(*)::int as weeks from pricing_weekly_sales($1, 16, $2) group by 1", [merchantId, TODAY])).rows;
    expect(rows).toHaveLength(14);
    for (const r of rows) expect(r.weeks).toBe(16);
  });

  it("au moins 2 changements de prix pour les produits dont l'élasticité est simulée", () => {
    for (const p of DEMO_PARAMS.pricing.products.filter((x) => x.elasticity !== null)) {
      const changes = p.multipliers.filter((m, i) => i > 0 && m !== p.multipliers[i - 1]).length;
      expect(changes, p.product).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("calculs sur la démo", () => {
  it("au moins 2 produits sous le seuil de marge", () => {
    const below = [...analyses.values()].filter((a) => a.belowThreshold).map((a) => a.product.name).sort();
    expect(below).toEqual(["Formule déjeuner", "Sandwich poulet crudités"]);
  });

  it("indice de prix : « — » sans relevé récent, > 115 pour la tropézienne", () => {
    expect(analyses.get("Pain aux céréales")!.priceIndex).toBeNull();
    expect(analyses.get("Tropézienne (part)")!.priceIndex).toBeGreaterThan(115);
    // Le relevé de 45 jours est ignoré : 2 concurrents récents, pas 3.
    expect(analyses.get("Baguette tradition")!.product.competitorCount).toBe(2);
  });

  it("produits à prix constant : données insuffisantes, aucune recommandation", () => {
    for (const name of ["Pain aux céréales", "Flan pâtissier (part)"]) {
      const a = analyses.get(name)!;
      expect(a.status, name).toBe("insufficient_data");
      expect(a.suggestion).toBeNull();
    }
  });

  it("élasticités retrouvées en moyenne : produits plaisir plus sensibles au prix que les produits de base", () => {
    // Sur 16 semaines, le bruit d'échantillonnage brouille chaque estimation
    // (d'où les niveaux de confiance) ; on vérifie l'écart entre les groupes.
    const mean = (names: string[]) =>
      names.reduce((s, n) => {
        const r = analyses.get(n)!.elasticity;
        return s + (r.status === "ok" ? r.rawElasticity : 0);
      }, 0) / names.length;
    const staples = ["Baguette", "Baguette tradition", "Café", "Formule déjeuner", "Sandwich poulet crudités", "Pain de campagne"];
    const treats = ["Croissant aux amandes", "Pain aux raisins", "Éclair au chocolat", "Tropézienne (part)"];
    expect(mean(treats)).toBeLessThan(-1.2);
    expect(mean(staples)).toBeGreaterThan(-1);
    expect(mean(treats)).toBeLessThan(mean(staples) - 0.5);
  });

  it("recommandations pour les produits attendus, garde-fous respectés", () => {
    const withReco = [...analyses.values()].filter((a) => a.status === "recommendation");
    expect(withReco.length).toBeGreaterThanOrEqual(8);
    for (const a of withReco) {
      const { price, unitCost, minMarginPct } = a.product;
      const p = a.suggestion!.recommendedPrice;
      expect(Math.abs(p / price - 1), a.product.name).toBeLessThanOrEqual(0.1 + 1e-9);
      if (!a.suggestion!.constraints.includes("margin_floor_unreachable")) {
        expect(p, a.product.name).toBeGreaterThanOrEqual(unitCost * (1 + minMarginPct / 100) - 1e-9);
      }
      if (a.priceIndex !== null && a.priceIndex > 115 && !a.belowThreshold) {
        expect(p, a.product.name).toBeLessThanOrEqual(price * 1.02 + 1e-9);
      }
    }
    expect(analyses.get("Baguette tradition")!.status).toBe("recommendation");
  });

  it("bandeau : marge moyenne, indice global, alertes et gain potentiel", () => {
    const s = summarize([...analyses.values()]);
    expect(s.averageMarginPct).toBeGreaterThan(40);
    expect(s.averageMarginPct).toBeLessThan(80);
    expect(s.globalPriceIndex).toBeGreaterThan(90);
    expect(s.globalPriceIndex).toBeLessThan(110);
    expect(s.belowThresholdCount).toBe(2);
    expect(s.potentialWeeklyGain).toBeGreaterThan(0);
  });
});
