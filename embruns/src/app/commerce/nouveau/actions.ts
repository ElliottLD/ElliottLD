"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { BUSINESS_TYPE_VALUES } from "@/lib/business-types";
import { getCurrentMerchant, requireUser } from "@/lib/merchant";
import { createClient } from "@/lib/supabase/server";

export type CreateMerchantState = { error?: string };

const schema = z.object({
  name: z.string().trim().min(1, "Indiquez le nom du commerce.").max(120, "120 caractères maximum."),
  business_type: z.enum(BUSINESS_TYPE_VALUES, { error: "Choisissez un type de commerce." }),
});

export async function createMerchant(_prev: CreateMerchantState, formData: FormData): Promise<CreateMerchantState> {
  await requireUser();
  if (await getCurrentMerchant()) redirect("/accueil");

  const parsed = schema.safeParse({ name: formData.get("name"), business_type: formData.get("business_type") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const supabase = await createClient();
  // owner_id est rempli par défaut avec auth.uid() et vérifié par RLS.
  const { error } = await supabase.from("merchants").insert(parsed.data);
  if (error && error.code !== "23505") return { error: "Création impossible pour le moment, réessayez." };

  redirect("/accueil");
}
