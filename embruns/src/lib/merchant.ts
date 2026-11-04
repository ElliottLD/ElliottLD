import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentMerchant = {
  id: string;
  name: string;
  business_type: string;
  brand_color: string;
};

/** Utilisateur connecté (vérifié via getClaims), sinon redirection vers la connexion. */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/connexion");
  return { id: claims.sub, email: (claims.email as string | undefined) ?? null };
});

/** Commerce du commerçant connecté (lu sous RLS), ou null s'il n'en a pas encore. */
export const getCurrentMerchant = cache(async (): Promise<CurrentMerchant | null> => {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("merchants")
    .select("id, name, business_type, brand_color")
    .maybeSingle();
  if (error) throw error;
  return data;
});

export async function requireMerchant(): Promise<CurrentMerchant> {
  const merchant = await getCurrentMerchant();
  if (!merchant) redirect("/commerce/nouveau");
  return merchant;
}
