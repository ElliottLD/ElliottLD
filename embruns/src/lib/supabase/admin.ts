import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";

/**
 * Client serveur qui contourne RLS. Réservé aux pages publiques (inscription,
 * carte), aux tâches planifiées et au mode démo, toujours filtré par
 * merchant_id dans le code appelant.
 */
export function createAdminClient() {
  const { supabaseUrl } = publicEnv();
  return createClient(supabaseUrl, serverEnv().supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
