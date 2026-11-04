import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { createTestDb, type TestDb } from "./test-db";

/** Tampons (section 4.1), synthèse des avis (4.4) et résultats de campagnes (4.5). */

let db: TestDb;
let owner: string;
let m: string;
let otherOwner: string;
let customer: string;

const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  (await db.client.query(sql, params)).rows as T[];
const one = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await q<T>(sql, params))[0];
const num = (v: unknown) => Number(v);

const asOwner = <T>(fn: (c: Client) => Promise<T>) => db.as({ role: "authenticated", userId: owner }, fn);
const stamp = (c: Client, at: string, amount: number | null = null) =>
  c.query("select add_stamp($1, $2, $3) as r", [customer, amount, at]).then((r) => r.rows[0].r as Record<string, unknown>);

beforeAll(async () => {
  db = await createTestDb();
  owner = (await one<{ id: string }>("insert into auth.users (email) values ('o@example.test') returning id")).id;
  otherOwner = (await one<{ id: string }>("insert into auth.users (email) values ('x@example.test') returning id")).id;
  m = (await one<{ id: string }>("insert into merchants (owner_id, name, stamps_required) values ($1, 'Test', 3) returning id", [owner])).id;
  await q("insert into merchants (owner_id, name) values ($1, 'Autre')", [otherOwner]);
  customer = (await one<{ id: string }>("insert into customers (merchant_id, first_name, email) values ($1, 'Léa', 'lea@example.test') returning id", [m])).id;
  await q("insert into loyalty_cards (merchant_id, customer_id) values ($1, $2)", [m, customer]);
});

afterAll(async () => {
  await db?.destroy();
});

describe("add_stamp", () => {
  it("ajoute un tampon et rattache la vente la plus proche à ± 5 minutes", async () => {
    await asOwner(async (c) => {
      // Deux ventes anonymes : à 3 min et à 1 min du passage ; une troisième hors fenêtre.
      await c.query(
        `insert into sales (merchant_id, source, external_id, occurred_at, total_amount) values
           ($1, 'csv', 'a', '2026-11-03T08:57:00Z', 4.2),
           ($1, 'csv', 'b', '2026-11-03T09:01:00Z', 6.5),
           ($1, 'csv', 'c', '2026-11-03T09:10:00Z', 6.5)`,
        [m],
      );
      const r = await stamp(c, "2026-11-03T09:00:00Z");
      expect(r.status).toBe("ok");
      expect(r.stamps).toBe(1);
      expect(r.reward).toBe(false);
      const sale = (await c.query("select external_id, customer_id from sales where id = $1", [r.sale_id])).rows[0];
      expect(sale.external_id).toBe("b");
      expect(sale.customer_id).toBe(customer);
    });
  });

  it("si un montant est saisi, ne rattache qu'une vente de même montant", async () => {
    await asOwner(async (c) => {
      await c.query(
        `insert into sales (merchant_id, source, external_id, occurred_at, total_amount) values
           ($1, 'csv', 'd', '2026-11-03T09:00:30Z', 3.0),
           ($1, 'csv', 'e', '2026-11-03T09:04:00Z', 7.8)`,
        [m],
      );
      const r = await stamp(c, "2026-11-03T09:00:00Z", 7.8);
      const sale = (await c.query("select external_id from sales where id = $1", [r.sale_id])).rows[0];
      expect(sale.external_id).toBe("e");
    });
  });

  it("sans vente dans la fenêtre, la visite est enregistrée sans vente", async () => {
    await asOwner(async (c) => {
      const r = await stamp(c, "2026-11-03T15:00:00Z");
      expect(r.status).toBe("ok");
      expect(r.sale_id).toBeNull();
    });
  });

  it("refuse un second tampon dans les 2 heures", async () => {
    await asOwner(async (c) => {
      await stamp(c, "2026-11-03T09:00:00Z");
      const r = await stamp(c, "2026-11-03T10:59:00Z");
      expect(r.status).toBe("too_soon");
      expect(r.stamps).toBe(1);
      const n = (await c.query("select count(*)::int as n from visits where customer_id = $1", [customer])).rows[0].n;
      expect(n).toBe(1);
      expect((await stamp(c, "2026-11-03T11:01:00Z")).status).toBe("ok");
    });
  });

  it("au N-ième tampon : récompense et carte remise à zéro", async () => {
    await asOwner(async (c) => {
      await stamp(c, "2026-11-01T09:00:00Z");
      await stamp(c, "2026-11-02T09:00:00Z");
      const r = await stamp(c, "2026-11-03T09:00:00Z");
      expect(r.reward).toBe(true);
      expect(r.stamps).toBe(0);
      expect(r.rewards_earned).toBe(1);
    });
  });

  it("un autre commerçant ne peut pas tamponner ce client", async () => {
    await expect(
      db.as({ role: "authenticated", userId: otherOwner }, (c) => c.query("select add_stamp($1)", [customer])),
    ).rejects.toThrow(/client introuvable/);
  });
});

describe("review_summary et campaign_results", () => {
  beforeAll(async () => {
    await q(
      `insert into reviews (merchant_id, rating, published_at, status, reply, replied_at) values
         ($1, 5, now() - interval '200 days', 'replied', 'Merci', now()),
         ($1, 3, now() - interval '120 days', 'replied', 'Merci', now()),
         ($1, 5, now() - interval '20 days', 'replied', 'Merci', now()),
         ($1, 2, now() - interval '3 days', 'to_handle', null, null)`,
      [m],
    );
    const camp = await one<{ id: string }>(
      "insert into campaigns (merchant_id, name, subject, message, status, sent_at) values ($1, 'Noël', 's', 'm', 'sent', '2026-10-01T08:00:00Z') returning id",
      [m],
    );
    const c2 = (await one<{ id: string }>("insert into customers (merchant_id, first_name, email) values ($1, 'Paul', 'paul@example.test') returning id", [m])).id;
    // Léa revient 5 jours après l'envoi (12 €) ; Paul ne revient pas.
    const sale = await one<{ id: string }>(
      "insert into sales (merchant_id, source, external_id, occurred_at, total_amount, customer_id) values ($1, 'csv', 'r1', '2026-10-06T08:00:00Z', 12, $2) returning id",
      [m, customer],
    );
    const visit = await one<{ id: string }>(
      "insert into visits (merchant_id, customer_id, visited_at, sale_id) values ($1, $2, '2026-10-06T08:00:00Z', $3) returning id",
      [m, customer, sale.id],
    );
    // Une vente de Léa après 14 jours ne compte pas.
    await q("insert into sales (merchant_id, source, external_id, occurred_at, total_amount, customer_id) values ($1, 'csv', 'r2', '2026-10-20T08:00:00Z', 50, $2)", [m, customer]);
    await q(
      `insert into campaign_sends (merchant_id, campaign_id, customer_id, sent_at, opened_at, return_visit_id) values
         ($1, $2, $3, '2026-10-01T08:00:00Z', '2026-10-01T09:00:00Z', $4),
         ($1, $2, $5, '2026-10-01T08:00:00Z', null, null)`,
      [m, camp.id, customer, visit.id, c2],
    );
  });

  it("note moyenne, note il y a 90 jours, avis à traiter, taux de réponse", async () => {
    const r = await asOwner(async (c) => (await c.query("select * from review_summary($1)", [m])).rows[0]);
    expect(num(r.reviews_count)).toBe(4);
    expect(num(r.rating_avg)).toBe(3.75);
    expect(num(r.rating_avg_90d_ago)).toBe(4);
    expect(num(r.new_reviews_90d)).toBe(2);
    expect(num(r.rating_avg_last_30d)).toBe(3.5);
    expect(num(r.to_handle)).toBe(1);
    expect(num(r.response_rate)).toBe(0.75);
  });

  it("envois, ouvertures, retours sous 14 jours et CA associé", async () => {
    const r = await asOwner(async (c) => (await c.query("select * from campaign_results($1)", [m])).rows[0]);
    expect(r.name).toBe("Noël");
    expect(num(r.recipients)).toBe(2);
    expect(num(r.opened)).toBe(1);
    expect(num(r.returned)).toBe(1);
    expect(num(r.return_rate)).toBe(0.5);
    expect(num(r.revenue_14d)).toBe(12);
  });

  it("un autre commerçant ne voit rien", async () => {
    const rows = await db.as({ role: "authenticated", userId: otherOwner }, async (c) =>
      (await c.query("select * from campaign_results($1)", [m])).rows,
    );
    expect(rows).toEqual([]);
  });
});
