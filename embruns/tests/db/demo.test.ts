import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_PARAMS } from "../../src/lib/demo/params";
import { createTestDb, type TestDb } from "./test-db";

/**
 * Jeu de démo « Au Pain Doré » (section 6.2) : volumes réalistes et scénarios
 * injectés vérifiés sur les données réellement générées.
 */

const TODAY = "2026-11-04"; // un mercredi
let db: TestDb;
let merchantId: string;
let firstRun: Record<string, unknown>;

const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  (await db.client.query(sql, params)).rows as T[];
const one = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await q<T>(sql, params))[0];
const num = (v: unknown) => Number(v);

/** Empreinte des données, pour vérifier le déterminisme. */
async function fingerprint() {
  return one(
    `select (select count(*) from sales where merchant_id = $1) as sales,
            (select sum(total_amount) from sales where merchant_id = $1) as revenue,
            (select count(*) from visits where merchant_id = $1) as visits,
            (select sum(quantity) from sale_items where merchant_id = $1) as items,
            (select string_agg(first_name || coalesce(phone, ''), ',' order by email) from customers where merchant_id = $1) as customers,
            (select sum(rating) from reviews where merchant_id = $1) as ratings`,
    [merchantId],
  );
}

beforeAll(async () => {
  db = await createTestDb();
  const user = await one<{ id: string }>("insert into auth.users (email) values ('demo@example.com') returning id");
  const merchant = await one<{ id: string }>(
    "insert into merchants (owner_id, name, is_demo) values ($1, 'Au Pain Doré', true) returning id",
    [user.id],
  );
  merchantId = merchant.id;
  await q("select public.generate_demo($1, $2, $3)", [merchantId, JSON.stringify(DEMO_PARAMS), TODAY]);
  firstRun = await fingerprint();
}, 120_000);

afterAll(async () => {
  await db?.destroy();
});

describe("Générateur de démo : volumes", () => {
  it("12 mois de ventes jusqu'à hier, fermé le lundi", async () => {
    const r = await one(
      `select min((occurred_at at time zone 'Europe/Paris')::date)::text as first,
              max((occurred_at at time zone 'Europe/Paris')::date)::text as last,
              count(*) filter (where extract(isodow from occurred_at at time zone 'Europe/Paris') = 1) as mondays
       from sales where merchant_id = $1`,
      [merchantId],
    );
    expect(r.first).toBe("2025-11-04");
    expect(r.last).toBe("2026-11-03");
    expect(num(r.mondays)).toBe(0);
  });

  it("250 à 350 tickets par jour en semaine, plus le week-end", async () => {
    const rows = await q<{ dow: number; per_day: string }>(
      `select extract(isodow from occurred_at at time zone 'Europe/Paris')::int as dow,
              count(*)::numeric / count(distinct (occurred_at at time zone 'Europe/Paris')::date) as per_day
       from sales where merchant_id = $1 group by 1 order by 1`,
      [merchantId],
    );
    const byDow = Object.fromEntries(rows.map((r) => [r.dow, num(r.per_day)]));
    for (const dow of [2, 3, 4, 5]) {
      expect(byDow[dow]).toBeGreaterThan(220);
      expect(byDow[dow]).toBeLessThan(300);
    }
    expect(byDow[6]).toBeGreaterThan(byDow[3]);
    expect(byDow[7]).toBeGreaterThan(byDow[3]);
    expect(byDow[6]).toBeLessThan(370);
  });

  it("pics d'affluence à 7-9 h, 12-13 h et 17-19 h", async () => {
    const rows = await q<{ hour: number; n: string }>(
      `select extract(hour from occurred_at at time zone 'Europe/Paris')::int as hour, count(*) as n
       from sales where merchant_id = $1 group by 1`,
      [merchantId],
    );
    const n = Object.fromEntries(rows.map((r) => [r.hour, num(r.n)]));
    expect(n[8]).toBeGreaterThan(n[10] * 2);
    expect(n[12]).toBeGreaterThan(n[14] * 2);
    expect(n[18]).toBeGreaterThan(n[15] * 2);
    expect(n[6] ?? 0).toBe(0);
    expect(n[20] ?? 0).toBe(0);
  });

  it("une quarantaine de produits en 5 catégories, panier moyen autour de 7 €", async () => {
    const r = await one(
      `select count(distinct product_name) as products, count(distinct category) as categories from sale_items where merchant_id = $1`,
      [merchantId],
    );
    expect(num(r.products)).toBeGreaterThanOrEqual(38);
    expect(num(r.categories)).toBe(5);
    const b = await one("select avg(total_amount) as basket from sales where merchant_id = $1", [merchantId]);
    expect(num(b.basket)).toBeGreaterThan(6.5);
    expect(num(b.basket)).toBeLessThan(7.6);
  });

  it("saisonnalité : galettes en janvier, bûches en décembre, glaces en été", async () => {
    const rows = await q<{ product_name: string; months: number[] }>(
      `select i.product_name, array_agg(distinct extract(month from s.occurred_at at time zone 'Europe/Paris')::int) as months
       from sale_items i join sales s on s.id = i.sale_id
       where i.merchant_id = $1 and i.product_name in ('Galette des rois (4 parts)', 'Bûche de Noël (6 parts)', 'Glace artisanale (pot)')
       group by 1`,
      [merchantId],
    );
    const months = Object.fromEntries(rows.map((r) => [r.product_name, [...r.months].sort((a, b) => a - b)]));
    expect(months["Galette des rois (4 parts)"]).toEqual([1]);
    expect(months["Bûche de Noël (6 parts)"]).toEqual([12]);
    expect(months["Glace artisanale (pot)"]).toEqual([6, 7, 8, 9]);
  });

  it("650 clients, part du CA identifiée de ~5 % à ~35 % sur l'année", async () => {
    const c = await one("select count(*) as n from customers where merchant_id = $1", [merchantId]);
    expect(num(c.n)).toBe(650);
    const share = async (from: string, to: string) =>
      num(
        (
          await one(
            `select sum(total_amount) filter (where customer_id is not null) / sum(total_amount) as s
             from sales where merchant_id = $1 and occurred_at >= $2 and occurred_at < $3`,
            [merchantId, from, to],
          )
        ).s,
      );
    const first = await share("2025-11-04", "2025-12-04");
    const last = await share("2026-10-04", "2026-11-04");
    expect(first).toBeGreaterThan(0.02);
    expect(first).toBeLessThan(0.09);
    expect(last).toBeGreaterThan(0.29);
    expect(last).toBeLessThan(0.41);
  });

  it("chaque visite est rattachée à une vente, une seule visite par client et par jour", async () => {
    const r = await one(
      `select count(*) filter (where sale_id is null) as unlinked,
              count(*) - count(distinct (customer_id, (visited_at at time zone 'Europe/Paris')::date)) as duplicates
       from visits where merchant_id = $1`,
      [merchantId],
    );
    expect(num(r.unlinked)).toBe(0);
    expect(num(r.duplicates)).toBe(0);
  });

  it("environ 180 avis, note moyenne autour de 4,5, dont 2 négatifs sans réponse", async () => {
    const r = await one(
      `select count(*) as n, avg(rating) as avg,
              count(*) filter (where rating <= 3 and status = 'to_handle' and published_at < $2::date - 2) as pending_negative,
              count(*) filter (where rating <= 3) as negative
       from reviews where merchant_id = $1`,
      [merchantId, TODAY],
    );
    expect(num(r.n)).toBeGreaterThanOrEqual(175);
    expect(num(r.n)).toBeLessThanOrEqual(190);
    expect(num(r.avg)).toBeGreaterThan(4.3);
    expect(num(r.avg)).toBeLessThan(4.7);
    expect(num(r.pending_negative)).toBe(2);
    expect(num(r.negative)).toBeGreaterThan(5);
  });

  it("3 campagnes passées, dont celle de Noël au-dessus de la moyenne", async () => {
    const rows = await q<{ name: string; rate: string }>(
      `select c.name, count(s.return_visit_id)::numeric / count(*) as rate
       from campaigns c join campaign_sends s on s.campaign_id = c.id
       where c.merchant_id = $1 group by 1`,
      [merchantId],
    );
    expect(rows).toHaveLength(3);
    const avg = rows.reduce((sum, r) => sum + num(r.rate), 0) / rows.length;
    const noel = rows.find((r) => r.name.startsWith("Noël"));
    expect(num(noel?.rate)).toBeGreaterThan(avg);
  });

  it("les clients sans consentement ne reçoivent aucune campagne", async () => {
    const r = await one(
      `select count(*) as n from campaign_sends s join customers c on c.id = s.customer_id
       where s.merchant_id = $1 and not c.marketing_consent`,
      [merchantId],
    );
    expect(num(r.n)).toBe(0);
  });
});

describe("Générateur de démo : scénarios injectés", () => {
  it("le mardi après-midi perd ~18 % sur 3 semaines vs les 8 précédentes, pas les autres créneaux", async () => {
    // CA moyen par occurrence de chaque créneau jour × demi-journée.
    const rows = await q<{ dow: number; pm: boolean; recent: string; before: string }>(
      `with s as (
         select (occurred_at at time zone 'Europe/Paris') as t, total_amount
         from sales where merchant_id = $1 and occurred_at >= $2::date - 77
       )
       select extract(isodow from t)::int as dow, extract(hour from t) >= 13 as pm,
              sum(total_amount) filter (where t >= $2::date - 21) / 3 as recent,
              sum(total_amount) filter (where t < $2::date - 21) / 8 as before
       from s group by 1, 2`,
      [merchantId, TODAY],
    );
    for (const r of rows) {
      const change = num(r.recent) / num(r.before) - 1;
      if (r.dow === 2 && r.pm) {
        expect(change).toBeLessThan(-0.15);
        expect(change).toBeGreaterThan(-0.25);
      } else {
        expect(Math.abs(change), `créneau ${r.dow} ${r.pm ? "après-midi" : "matin"}`).toBeLessThan(0.15);
      }
    }
  });

  it("une vingtaine de réguliers à risque", async () => {
    const r = await one(
      "select count(*) filter (where segment = 'at_risk') as n from customer_segments($1, $2::date - 1)",
      [merchantId, TODAY],
    );
    expect(num(r.n)).toBeGreaterThanOrEqual(15);
    expect(num(r.n)).toBeLessThanOrEqual(35);
  });

  it("le flan progresse d'environ 35 % sur 4 semaines", async () => {
    const r = await one(
      `select revenue, previous_revenue from top_products($1, $2::date - 28, $2::date - 1, 40)
       where product_name = 'Flan pâtissier (part)'`,
      [merchantId, TODAY],
    );
    const change = num(r.revenue) / num(r.previous_revenue) - 1;
    expect(change).toBeGreaterThan(0.25);
    expect(change).toBeLessThan(0.5);
  });

  it("plus de 10 clients à un tampon de la récompense", async () => {
    const r = await one(
      `select count(*) as n from loyalty_cards l join merchants m on m.id = l.merchant_id
       where l.merchant_id = $1 and l.current_stamps = m.stamps_required - 1`,
      [merchantId],
    );
    expect(num(r.n)).toBeGreaterThan(10);
  });
});

describe("Générateur de démo : sécurité et déterminisme", () => {
  it("refuse un commerce qui n'est pas en mode démo", async () => {
    const u = await one<{ id: string }>("insert into auth.users (email) values ('vrai@example.com') returning id");
    const m = await one<{ id: string }>("insert into merchants (owner_id, name) values ($1, 'Vrai commerce') returning id", [u.id]);
    await expect(q("select public.generate_demo($1, $2, $3)", [m.id, JSON.stringify(DEMO_PARAMS), TODAY])).rejects.toThrow(
      /pas un commerce de démo/,
    );
  });

  it("n'est pas appelable par un commerçant connecté (réservé au serveur)", async () => {
    const owner = await one<{ owner_id: string }>("select owner_id from merchants where id = $1", [merchantId]);
    await expect(
      db.as({ role: "authenticated", userId: owner.owner_id }, (c) =>
        c.query("select public.generate_demo($1, $2, $3)", [merchantId, JSON.stringify(DEMO_PARAMS), TODAY]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("régénérer donne exactement les mêmes données", async () => {
    await q("select public.generate_demo($1, $2, $3)", [merchantId, JSON.stringify(DEMO_PARAMS), TODAY]);
    expect(await fingerprint()).toEqual(firstRun);
  }, 120_000);
});
