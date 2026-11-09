import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { createTestDb, type TestDb } from "./test-db";

/**
 * Isolation entre deux commerçants (sections 6 et 9) : chaque commerçant ne
 * voit, ne modifie et ne supprime que les données de son commerce, et le rôle
 * anonyme n'accède à aucune table.
 */

const TABLES = [
  "merchants",
  "customers",
  "loyalty_cards",
  "sales",
  "sale_items",
  "visits",
  "reviews",
  "insights",
  "recommendations",
  "campaigns",
  "campaign_sends",
  "automations",
  "automation_sends",
  "integrations",
  "import_jobs",
  "assistant_messages",
  "products",
  "competitor_prices",
  "price_recommendations",
  "product_price_changes",
] as const;

type Seeded = { userId: string; merchantId: string; customerId: string; saleId: string; visitId: string; reviewId: string };

let db: TestDb;
let alice: Seeded;
let bob: Seeded;

async function seedMerchant(c: Client, email: string, suffix: string): Promise<Seeded> {
  const q = async (sql: string, params: unknown[] = []) => (await c.query(sql, params)).rows[0]?.id as string;
  const userId = await q("insert into auth.users (email) values ($1) returning id", [email]);
  const merchantId = await q("insert into merchants (owner_id, name) values ($1, $2) returning id", [userId, `Commerce ${suffix}`]);
  const customerId = await q(
    "insert into customers (merchant_id, first_name, email, marketing_consent, marketing_consent_at) values ($1, 'Léa', $2, true, now()) returning id",
    [merchantId, `lea-${suffix}@example.test`],
  );
  await c.query("insert into loyalty_cards (merchant_id, customer_id) values ($1, $2)", [merchantId, customerId]);
  const saleId = await q(
    "insert into sales (merchant_id, source, external_id, occurred_at, total_amount, customer_id) values ($1, 'demo', $2, now(), 7.20, $3) returning id",
    [merchantId, `sale-${suffix}`, customerId],
  );
  await c.query("insert into sale_items (merchant_id, sale_id, product_name, category, quantity, unit_price) values ($1, $2, 'Flan', 'pâtisseries', 1, 3.60)", [merchantId, saleId]);
  const visitId = await q("insert into visits (merchant_id, customer_id, sale_id) values ($1, $2, $3) returning id", [merchantId, customerId, saleId]);
  const reviewId = await q("insert into reviews (merchant_id, rating, body, author_name, published_at) values ($1, 2, 'Bof', 'Marc', now()) returning id", [merchantId]);
  await c.query("insert into insights (merchant_id, week_start, detector, payload) values ($1, current_date, 'slot_drop', '{}')", [merchantId]);
  const recoId = await q(
    "insert into recommendations (merchant_id, week_start, title, explanation, action_type) values ($1, current_date, 'T', 'E', 'campaign') returning id",
    [merchantId],
  );
  const campaignId = await q(
    "insert into campaigns (merchant_id, name, subject, message, recommendation_id) values ($1, 'Noël', 'Objet', 'Message', $2) returning id",
    [merchantId, recoId],
  );
  await c.query("insert into campaign_sends (merchant_id, campaign_id, customer_id, return_visit_id) values ($1, $2, $3, $4)", [merchantId, campaignId, customerId, visitId]);
  await c.query("insert into automations (merchant_id, type, is_active) values ($1, 'welcome', true)", [merchantId]);
  await c.query("insert into automation_sends (merchant_id, type, customer_id, visit_id) values ($1, 'review_request', $2, $3)", [merchantId, customerId, visitId]);
  await c.query(
    "insert into integrations (merchant_id, provider, status, access_token_encrypted, refresh_token_encrypted) values ($1, 'sumup', 'connected', 'enc:secret', 'enc:refresh')",
    [merchantId],
  );
  await c.query("insert into import_jobs (merchant_id, file_name) values ($1, 'ventes.csv')", [merchantId]);
  await c.query("insert into assistant_messages (merchant_id, role, content) values ($1, 'user', '{\"text\":\"Bonjour\"}')", [merchantId]);
  const productId = await q("insert into products (merchant_id, name, price, unit_cost) values ($1, 'Flan', 2.8, 0.8) returning id", [merchantId]);
  await c.query("insert into competitor_prices (merchant_id, product_id, competitor_name, price) values ($1, $2, 'Concurrent', 2.9)", [merchantId, productId]);
  const priceRecoId = await q(
    "insert into price_recommendations (merchant_id, product_id, current_price, recommended_price, elasticity, confidence, estimated_weekly_impact, explanation, explanation_source) values ($1, $2, 2.8, 2.99, -0.4, 'high', 5, 'x', 'template') returning id",
    [merchantId, productId],
  );
  await c.query("insert into product_price_changes (merchant_id, product_id, old_price, new_price, source, recommendation_id) values ($1, $2, 2.8, 2.99, 'recommendation', $3)", [merchantId, productId, priceRecoId]);
  return { userId, merchantId, customerId, saleId, visitId, reviewId };
}

const merchantColumn = (table: string) => (table === "merchants" ? "id" : "merchant_id");

beforeAll(async () => {
  db = await createTestDb();
  alice = await seedMerchant(db.client, "alice@example.test", "a");
  bob = await seedMerchant(db.client, "bob@example.test", "b");
});

afterAll(async () => {
  await db?.destroy();
});

describe("RLS : isolation entre commerçants", () => {
  it("RLS est activée sur toutes les tables du schéma public", async () => {
    const { rows } = await db.client.query(
      "select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity",
    );
    expect(rows).toEqual([]);
  });

  it("la liste testée couvre toutes les tables", async () => {
    const { rows } = await db.client.query("select tablename from pg_tables where schemaname = 'public' order by 1");
    expect(rows.map((r) => r.tablename).sort()).toEqual([...TABLES].sort());
  });

  it.each(TABLES)("%s : un commerçant ne lit que ses propres lignes", async (table) => {
    const col = merchantColumn(table);
    const select = table === "integrations" ? "merchant_id" : col;
    await db.as({ role: "authenticated", userId: alice.userId }, async (c) => {
      const { rows } = await c.query(`select ${select} as m from ${table}`);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.m === alice.merchantId)).toBe(true);
    });
  });

  it.each(TABLES)("%s : un commerçant ne peut ni modifier ni supprimer les lignes d'un autre", async (table) => {
    const col = merchantColumn(table);
    await db.as({ role: "authenticated", userId: alice.userId }, async (c) => {
      if (table !== "integrations") {
        const upd = await c.query(`update ${table} set ${col} = ${col} where ${col} = $1`, [bob.merchantId]);
        expect(upd.rowCount).toBe(0);
      }
      const del = await c.query(`delete from ${table} where ${col} = $1`, [bob.merchantId]);
      expect(del.rowCount).toBe(0);
    });
    const { rows } = await db.client.query(`select count(*)::int as n from ${table} where ${col} = $1`, [bob.merchantId]);
    expect(rows[0].n).toBeGreaterThan(0);
  });

  it.each(TABLES)("%s : le rôle anonyme n'a aucun accès", async (table) => {
    await expect(db.as({ role: "anon" }, (c) => c.query(`select 1 from ${table} limit 1`))).rejects.toThrow(/permission denied/);
  });

  it("un utilisateur connecté sans commerce ne voit rien", async () => {
    const { rows } = await db.client.query("insert into auth.users (email) values ('eve@example.test') returning id");
    for (const table of TABLES) {
      const select = table === "integrations" ? "id" : "*";
      const n = await db.as({ role: "authenticated", userId: rows[0].id }, async (c) => (await c.query(`select ${select} from ${table}`)).rowCount);
      expect(n, table).toBe(0);
    }
  });

  it("insérer une ligne dans le commerce d'un autre est refusé", async () => {
    await expect(
      db.as({ role: "authenticated", userId: alice.userId }, (c) =>
        c.query("insert into customers (merchant_id, email) values ($1, 'intrus@example.test')", [bob.merchantId]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("déplacer une ligne vers le commerce d'un autre est refusé", async () => {
    await expect(
      db.as({ role: "authenticated", userId: alice.userId }, (c) =>
        c.query("update reviews set merchant_id = $1 where id = $2", [bob.merchantId, alice.reviewId]),
      ),
    ).rejects.toThrow(/row-level security|violates foreign key/);
  });

  it("créer un commerce au nom d'un autre utilisateur est refusé", async () => {
    await expect(
      db.as({ role: "authenticated", userId: alice.userId }, (c) =>
        c.query("insert into merchants (owner_id, name) values ($1, 'Faux')", [bob.userId]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("une ligne ne peut pas pointer vers la donnée d'un autre commerce (clés composites)", async () => {
    await expect(
      db.as({ role: "authenticated", userId: alice.userId }, (c) =>
        c.query("insert into visits (merchant_id, customer_id) values ($1, $2)", [alice.merchantId, bob.customerId]),
      ),
    ).rejects.toThrow(/foreign key/);
    await expect(
      db.as({ role: "authenticated", userId: alice.userId }, (c) =>
        c.query("update sales set customer_id = $1 where id = $2", [bob.customerId, alice.saleId]),
      ),
    ).rejects.toThrow(/foreign key/);
  });

  it("les jetons OAuth chiffrés ne sont jamais lisibles par le navigateur", async () => {
    await expect(
      db.as({ role: "authenticated", userId: alice.userId }, (c) => c.query("select access_token_encrypted from integrations")),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.as({ role: "authenticated", userId: alice.userId }, (c) =>
        c.query("update integrations set refresh_token_encrypted = 'x' where merchant_id = $1", [alice.merchantId]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("le serveur (service_role) contourne RLS", async () => {
    await db.client.query("begin");
    try {
      await db.client.query("set local role service_role");
      const { rows } = await db.client.query("select count(*)::int as n from merchants");
      expect(rows[0].n).toBeGreaterThanOrEqual(2);
    } finally {
      await db.client.query("rollback");
    }
  });
});

describe("Contraintes métier du schéma", () => {
  it("le jeton public de la carte est long et aléatoire", async () => {
    const { rows } = await db.client.query("select public_token from loyalty_cards");
    for (const r of rows) expect(r.public_token).toMatch(/^[0-9a-f]{48}$/);
  });

  it("un client par email normalisé et par commerce", async () => {
    await expect(
      db.client.query("insert into customers (merchant_id, email) values ($1, 'lea-a@example.test')", [alice.merchantId]),
    ).rejects.toThrow(/duplicate key/);
    // Le même email chez un autre commerce est autorisé.
    await db.client.query("begin");
    await db.client.query("insert into customers (merchant_id, email) values ($1, 'lea-a@example.test')", [bob.merchantId]);
    await db.client.query("rollback");
  });

  it("les ventes sont idempotentes par (commerce, source, identifiant externe)", async () => {
    await expect(
      db.client.query("insert into sales (merchant_id, source, external_id, occurred_at, total_amount) values ($1, 'demo', 'sale-a', now(), 1)", [alice.merchantId]),
    ).rejects.toThrow(/duplicate key/);
  });

  it("le consentement marketing doit être horodaté", async () => {
    await expect(
      db.client.query("insert into customers (merchant_id, email, marketing_consent) values ($1, 'x@example.test', true)", [alice.merchantId]),
    ).rejects.toThrow(/consent_is_timestamped/);
  });

  it("un seul commerce par compte", async () => {
    await expect(db.client.query("insert into merchants (owner_id, name) values ($1, 'Second')", [alice.userId])).rejects.toThrow(/duplicate key/);
  });
});
