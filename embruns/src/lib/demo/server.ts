import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMO_PARAMS } from "./params";

/** Compte de démo partagé : jamais une vraie adresse, aucun email n'y est envoyé. */
export const DEMO_EMAIL = process.env.DEMO_USER_EMAIL ?? "demo@example.com";

const DEMO_MERCHANT = {
  name: "Au Pain Doré",
  business_type: "bakery",
  brand_tone: "warm",
  google_review_url: "https://www.google.com/maps/search/?api=1&query=boulangerie+Toulon",
  is_demo: true,
} as const;

/** Commerce de démo du compte de démo, créé au besoin (client serveur, clé secrète). */
export async function ensureDemoMerchant(admin: SupabaseClient, demoUserId: string) {
  const { data: existing, error } = await admin
    .from("merchants")
    .select("id, demo_generated_on, timezone")
    .eq("owner_id", demoUserId)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing as { id: string; demo_generated_on: string | null; timezone: string };

  const { data, error: insertError } = await admin
    .from("merchants")
    .insert({ ...DEMO_MERCHANT, owner_id: demoUserId })
    .select("id, demo_generated_on, timezone")
    .single();
  if (insertError) throw insertError;
  return data as { id: string; demo_generated_on: string | null; timezone: string };
}

/** Régénère toutes les données du commerce de démo (≈ 20 s sur le plan gratuit Supabase). */
export async function regenerateDemo(admin: SupabaseClient, merchantId: string) {
  const { data, error } = await admin.rpc("generate_demo", { p_merchant_id: merchantId, p: DEMO_PARAMS });
  if (error) throw error;
  return data as Record<string, unknown>;
}
