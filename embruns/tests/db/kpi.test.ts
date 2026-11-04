import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./test-db";

/**
 * KPI et segments (sections 4.2 et 4.3) sur un petit jeu de données dont tous
 * les résultats sont calculés à la main.
 *
 * Fuseau du commerce : Europe/Paris (UTC+1 en novembre).
 * Période courante : du 26 octobre au 1er novembre 2026 (7 jours).
 * Période précédente : du 19 au 25 octobre 2026.
 */

let db: TestDb;
let m: string;
let owner: string;
const ids: Record<string, string> = {};

const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  (await db.client.query(sql, params)).rows as T[];
const one = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await q<T>(sql, params))[0];
const num = (v: unknown) => Number(v);

async function customer(key: string, createdAt: string) {
  const r = await one<{ id: string }>(
    "insert into customers (merchant_id, first_name, email, created_at) values ($1, $2, $3, $4) returning id",
    [m, key, `${key}@example.test`, createdAt],
  );
  ids[key] = r.id;
  return r.id;
}

async function sale(at: string, total: number, customerKey?: string, items: [string, string, number, number][] = []) {
  const customerId = customerKey ? ids[customerKey] : null;
  const r = await one<{ id: string }>(
    "insert into sales (merchant_id, source, external_id, occurred_at, total_amount, customer_id) values ($1, 'csv', gen_random_uuid()::text, $2, $3, $4) returning id",
    [m, at, total, customerId],
  );
  for (const [product, category, quantity, price] of items) {
    await q(
      "insert into sale_items (merchant_id, sale_id, product_name, category, quantity, unit_price) values ($1, $2, $3, $4, $5, $6)",
      [m, r.id, product, category, quantity, price],
    );
  }
  if (customerId) {
    await q("insert into visits (merchant_id, customer_id, visited_at, sale_id, amount) values ($1, $2, $3, $4, $5)", [
      m, customerId, at, r.id, total,
    ]);
  }
  return r.id;
}

async function visit(customerKey: string, at: string) {
  await q("insert into visits (merchant_id, customer_id, visited_at) values ($1, $2, $3)", [m, ids[customerKey], at]);
}

beforeAll(async () => {
  db = await createTestDb();
  owner = (await one<{ id: string }>("insert into auth.users (email) values ('kpi@example.test') returning id")).id;
  m = (await one<{ id: string }>("insert into merchants (owner_id, name) values ($1, 'Test KPI') returning id", [owner])).id;

  await customer("alice", "2026-10-27T08:00:00+01:00"); // nouvelle inscrite de la période courante
  await customer("bruno", "2026-10-20T08:00:00+02:00"); // inscrit pendant la période précédente

  // Période courante (26/10 → 01/11).
  await sale("2026-10-27T08:00:00+01:00", 10, "alice", [["Croissant", "viennoiseries", 2, 1.3], ["Baguette", "pains", 3, 1.2]]);
  await sale("2026-10-28T12:30:00+01:00", 20, undefined, [["Formule déjeuner", "snacking", 2, 8.9]]);
  // 1er novembre à 23 h 30 à Paris = 22 h 30 UTC : appartient bien au 1er novembre local.
  await sale("2026-11-01T22:30:00Z", 6, "bruno", [["Croissant", "viennoiseries", 4, 1.3]]);
  // 2 novembre à 0 h 30 à Paris = 1er novembre 23 h 30 UTC : hors période.
  await sale("2026-11-01T23:30:00Z", 100);
  // Retour d'Alice 5 jours après son inscription.
  await visit("alice", "2026-11-01T09:00:00+01:00");

  // Période précédente (19/10 → 25/10), heure d'été (UTC+2).
  await sale("2026-10-20T08:00:00+02:00", 8, "bruno", [["Baguette", "pains", 5, 1.2]]);
  await sale("2026-10-24T17:00:00+02:00", 12, undefined, [["Croissant", "viennoiseries", 1, 1.3]]);
});

afterAll(async () => {
  await db?.destroy();
});

describe("kpi_summary", () => {
  it("calcule la période et la période précédente de même durée, dans le fuseau du commerce", async () => {
    const rows = await db.as({ role: "authenticated", userId: owner }, async (c) =>
      (await c.query("select * from kpi_summary($1, '2026-10-26', '2026-11-01')", [m])).rows,
    );
    const cur = rows.find((r) => r.period === "current")!;
    const prev = rows.find((r) => r.period === "previous")!;

    expect(num(cur.revenue)).toBe(36);
    expect(num(cur.tickets)).toBe(3);
    expect(num(cur.avg_basket)).toBe(12);
    expect(num(cur.identified_revenue)).toBe(16);
    expect(num(cur.identified_share)).toBeCloseTo(16 / 36, 4);
    expect(num(cur.new_customers)).toBe(1);
    expect(num(cur.returned_30d)).toBe(1);
    expect(num(cur.return_rate_30d)).toBe(1);
    // 3 visites (Alice ×2, Bruno ×1), 2 clients actifs, sur 7 jours → 1,5 × 30/7 par mois.
    expect(num(cur.visits)).toBe(3);
    expect(num(cur.active_customers)).toBe(2);
    expect(num(cur.visit_frequency)).toBeCloseTo((3 / 2) * (30 / 7), 2);

    expect(num(prev.revenue)).toBe(20);
    expect(num(prev.tickets)).toBe(2);
    expect(num(prev.avg_basket)).toBe(10);
    // Bruno, inscrit le 20/10, est revenu le 1er novembre (12 jours plus tard).
    expect(num(prev.new_customers)).toBe(1);
    expect(num(prev.returned_30d)).toBe(1);
  });

  it("ne renvoie rien des données d'un autre commerce (RLS)", async () => {
    const other = (await one<{ id: string }>("insert into auth.users (email) values ('autre@example.test') returning id")).id;
    const rows = await db.as({ role: "authenticated", userId: other }, async (c) =>
      (await c.query("select * from kpi_summary($1, '2026-10-26', '2026-11-01')", [m])).rows,
    );
    for (const r of rows) {
      expect(num(r.revenue)).toBe(0);
      expect(num(r.tickets)).toBe(0);
    }
  });

  it("n'est pas accessible au rôle anonyme", async () => {
    await expect(
      db.as({ role: "anon" }, (c) => c.query("select * from kpi_summary($1, '2026-10-26', '2026-11-01')", [m])),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("sales_by_day, sales_by_slot, top_products", () => {
  it("CA par jour local, jours sans vente inclus", async () => {
    const rows = await q<{ day: Date; revenue: string; tickets: string }>(
      "select day::text as day, revenue, tickets from sales_by_day($1, '2026-10-26', '2026-11-01')",
      [m],
    );
    expect(rows).toHaveLength(7);
    const byDay = Object.fromEntries(rows.map((r) => [String(r.day), num(r.revenue)]));
    expect(byDay["2026-10-26"]).toBe(0);
    expect(byDay["2026-10-27"]).toBe(10);
    expect(byDay["2026-10-28"]).toBe(20);
    expect(byDay["2026-11-01"]).toBe(6);
  });

  it("CA par jour de semaine × heure locale", async () => {
    const rows = await q<{ isodow: number; hour: number; revenue: string }>(
      "select * from sales_by_slot($1, '2026-10-26', '2026-11-01')",
      [m],
    );
    expect(rows.map((r) => [r.isodow, r.hour, num(r.revenue)])).toEqual([
      [2, 8, 10],
      [3, 12, 20],
      [7, 23, 6],
    ]);
  });

  it("top produits en CA et en quantité, avec la période précédente", async () => {
    const rows = await q<Record<string, string>>(
      "select * from top_products($1, '2026-10-26', '2026-11-01', 10)",
      [m],
    );
    const byName = Object.fromEntries(rows.map((r) => [r.product_name, r]));
    expect(rows.map((r) => r.product_name)).toEqual(["Formule déjeuner", "Croissant", "Baguette"]);
    expect(num(byName["Croissant"].revenue)).toBeCloseTo(6 * 1.3, 2);
    expect(num(byName["Croissant"].quantity)).toBe(6);
    expect(num(byName["Croissant"].previous_quantity)).toBe(1);
    expect(num(byName["Croissant"].rank_quantity)).toBe(1);
    expect(num(byName["Baguette"].previous_revenue)).toBeCloseTo(6, 2);
  });
});

describe("customer_segments", () => {
  const AS_OF = "2026-11-01";
  let segments: Record<string, string>;

  beforeAll(async () => {
    const day = (n: number, hour = 9) => {
      const d = new Date(Date.UTC(2026, 10, 1, hour - 1)); // 1er novembre, heure de Paris (UTC+1)
      d.setUTCDate(d.getUTCDate() - n);
      return d.toISOString();
    };
    // Régulier : une visite par semaine depuis 12 semaines, la dernière il y a 3 jours.
    await customer("regulier", day(120));
    for (let w = 0; w < 12; w++) await visit("regulier", day(3 + 7 * w));
    // À risque : hebdomadaire, plus venu depuis 30 jours (> 21 j et > 2 × 7 j).
    await customer("a_risque", day(200));
    for (let w = 0; w < 10; w++) await visit("a_risque", day(30 + 7 * w));
    // Limite : plus venu depuis 20 jours → pas encore à risque (≤ 21 j).
    await customer("limite", day(200));
    for (let w = 0; w < 10; w++) await visit("limite", day(20 + 7 * w));
    // Perdu : dernière visite il y a 100 jours.
    await customer("perdu", day(300));
    await visit("perdu", day(150));
    await visit("perdu", day(100));
    // Nouveau : inscrit et venu il y a 10 jours.
    await customer("nouveau", day(10));
    await visit("nouveau", day(10));
    // Occasionnel : 2 visites, la première il y a 60 jours.
    await customer("occasionnel", day(60));
    await visit("occasionnel", day(60));
    await visit("occasionnel", day(15));
    // VIP : régulier qui dépense de loin le plus sur 90 jours.
    await customer("vip", day(120));
    for (let w = 0; w < 6; w++) await sale(day(2 + 7 * w, 10), 80, "vip");
    // Neuf autres clients qui dépensent peu, pour que le VIP soit dans le top 10 %.
    for (let k = 0; k < 9; k++) {
      await customer(`petit${k}`, day(40));
      await sale(day(5 + k, 11), 5 + k, `petit${k}`);
    }

    const rows = await q<{ first_name: string; segment: string }>(
      "select first_name, segment from customer_segments($1, $2)",
      [m, AS_OF],
    );
    segments = Object.fromEntries(rows.map((r) => [r.first_name, r.segment]));
  });

  it.each([
    ["regulier", "regular"],
    ["a_risque", "at_risk"],
    ["limite", "regular"],
    ["perdu", "lost"],
    ["nouveau", "new"],
    ["occasionnel", "occasional"],
    ["vip", "vip"],
  ])("%s → %s", (name, expected) => {
    expect(segments[name]).toBe(expected);
  });

  it("le top 10 % de la dépense ne contient que le VIP", () => {
    const vips = Object.entries(segments).filter(([, s]) => s === "vip");
    expect(vips.map(([n]) => n)).toEqual(["vip"]);
  });
});
