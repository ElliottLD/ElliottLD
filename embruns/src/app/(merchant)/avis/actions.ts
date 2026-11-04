"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMerchant } from "@/lib/merchant";
import { createClient } from "@/lib/supabase/server";

export type ReplyState = { status: "idle" | "error"; message?: string };

const schema = z.object({
  reviewId: z.uuid(),
  reply: z.string().trim().min(2, "Écrivez une réponse.").max(1500, "1 500 caractères maximum."),
});

/** Enregistre la réponse du commerçant et passe l'avis en « répondu ». */
export async function replyToReview(_prev: ReplyState, formData: FormData): Promise<ReplyState> {
  const merchant = await requireMerchant();
  const parsed = schema.safeParse({ reviewId: formData.get("reviewId"), reply: formData.get("reply") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("reviews")
    .update({ reply: parsed.data.reply, replied_at: new Date().toISOString(), status: "replied" }, { count: "exact" })
    .eq("id", parsed.data.reviewId)
    .eq("merchant_id", merchant.id);
  if (error || !count) return { status: "error", message: "Enregistrement impossible, réessayez." };
  revalidatePath("/avis");
  return { status: "idle" };
}
