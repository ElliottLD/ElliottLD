import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { Client } from "pg";

/**
 * Base de test jetable : une base Postgres neuve par fichier de test,
 * avec le stub Supabase (rôles, auth.uid()) puis toutes les migrations.
 *
 * TEST_DATABASE_URL pointe vers un serveur Postgres où l'on peut créer des
 * bases (par défaut : Postgres local, utilisateur postgres).
 */
const ADMIN_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/postgres";
const ROOT = path.resolve(__dirname, "../..");

function withDatabase(url: string, database: string) {
  const u = new URL(url);
  u.pathname = `/${database}`;
  return u.toString();
}

export type TestDb = {
  client: Client;
  /** Exécute fn dans une transaction annulée, avec le rôle et l'identité donnés. */
  as<T>(who: { role: "anon" } | { role: "authenticated"; userId: string }, fn: (c: Client) => Promise<T>): Promise<T>;
  destroy(): Promise<void>;
};

export async function createTestDb(): Promise<TestDb> {
  const name = `embruns_test_${randomBytes(6).toString("hex")}`;
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`create database ${name}`);
  await admin.end();

  const client = new Client({ connectionString: withDatabase(ADMIN_URL, name) });
  await client.connect();
  await client.query(readFileSync(path.join(ROOT, "supabase/tests/supabase-stub.sql"), "utf8"));
  const migrationsDir = path.join(ROOT, "supabase/migrations");
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    await client.query(readFileSync(path.join(migrationsDir, file), "utf8"));
  }

  return {
    client,
    async as(who, fn) {
      await client.query("begin");
      try {
        await client.query(`set local role ${who.role}`);
        const claims = who.role === "authenticated" ? { sub: who.userId, role: "authenticated" } : { role: "anon" };
        await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
        return await fn(client);
      } finally {
        await client.query("rollback");
      }
    },
    async destroy() {
      await client.end();
      const a = new Client({ connectionString: ADMIN_URL });
      await a.connect();
      await a.query(`drop database if exists ${name} with (force)`);
      await a.end();
    },
  };
}
