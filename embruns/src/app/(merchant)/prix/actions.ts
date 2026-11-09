"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMerchant } from "@/lib/merchant";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { status: "idle" | "done" | "error"; message?: string };

const recoSchema = z.object({ recommendationId: z.uuid() });

/** « Appliquer » : met à jour le prix du produit, l'historique et le statut de la recommandation. */
export async function applyRecommendation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const merchant = await requireMerchant();
  const parsed = recoSchema.safeParse({ recommendationId: formData.get("recommendationId") });
  if (!parsed.success) return { status: "error", message: "Recommandation inconnue." };
  const supabase = await createClient();

  const { data: reco, error } = await supabase
    .from("price_recommendations")
    .select("id, product_id, current_price, recommended_price, status")
    .eq("id", parsed.data.recommendationId)
    .eq("merchant_id", merchant.id)
    .maybeSingle();
  if (error || !reco) return { status: "error", message: "Recommandation introuvable." };
  if (reco.status !== "proposed") return { status: "error", message: "Cette recommandation a déjà été traitée." };

  // Le prix ne change que s'il est toujours celui sur lequel la recommandation a été calculée.
  const { data: updated, error: updateError } = await supabase
    .from("products")
    .update({ price: reco.recommended_price, updated_at: new Date().toISOString() })
    .eq("id", reco.product_id)
    .eq("price", reco.current_price)
    .select("id");
  if (updateError) return { status: "error", message: "Mise à jour impossible, réessayez." };
  if (!updated?.length) return { status: "error", message: "Le prix a changé depuis le calcul : rechargez la page." };

  const [change, status] = await Promise.all([
    supabase.from("product_price_changes").insert({
      merchant_id: merchant.id,
      product_id: reco.product_id,
      old_price: reco.current_price,
      new_price: reco.recommended_price,
      source: "recommendation",
      recommendation_id: reco.id,
    }),
    supabase.from("price_recommendations").update({ status: "accepted", decided_at: new Date().toISOString() }).eq("id", reco.id),
  ]);
  if (change.error || status.error) return { status: "error", message: "Prix mis à jour, mais l'historique n'a pas pu être enregistré." };

  revalidatePath("/prix", "layout");
  revalidatePath("/accueil");
  return { status: "done" };
}

/** « Ignorer » : la recommandation n'est plus proposée cette semaine. */
export async function ignoreRecommendation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const merchant = await requireMerchant();
  const parsed = recoSchema.safeParse({ recommendationId: formData.get("recommendationId") });
  if (!parsed.success) return { status: "error", message: "Recommandation inconnue." };
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("price_recommendations")
    .update({ status: "ignored", decided_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", parsed.data.recommendationId)
    .eq("merchant_id", merchant.id)
    .eq("status", "proposed");
  if (error || !count) return { status: "error", message: "Action impossible, réessayez." };
  revalidatePath("/prix", "layout");
  revalidatePath("/accueil");
  return { status: "done" };
}

const competitorSchema = z.object({
  productId: z.uuid(),
  competitorName: z.string().trim().min(1, "Indiquez le concurrent.").max(80),
  price: z
    .string()
    .trim()
    .transform((v) => Number(v.replace(",", ".")))
    .refine((v) => Number.isFinite(v) && v > 0 && v < 10000, "Prix invalide."),
  observedAt: z.iso.date().optional().or(z.literal("").transform(() => undefined)),
});

/** Ajout rapide d'un prix concurrent ; l'indice de prix est recalculé au rechargement. */
export async function addCompetitorPrice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const merchant = await requireMerchant();
  const parsed = competitorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  const supabase = await createClient();
  const { error } = await supabase.from("competitor_prices").insert({
    merchant_id: merchant.id,
    product_id: parsed.data.productId,
    competitor_name: parsed.data.competitorName,
    price: parsed.data.price,
    ...(parsed.data.observedAt ? { observed_at: parsed.data.observedAt } : {}),
  });
  if (error) return { status: "error", message: "Enregistrement impossible, réessayez." };
  revalidatePath("/prix", "layout");
  return { status: "done" };
}
