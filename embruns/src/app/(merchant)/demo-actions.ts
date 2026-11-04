"use server";

import { revalidatePath } from "next/cache";
import { regenerateDemo } from "@/lib/demo/server";
import { requireMerchant } from "@/lib/merchant";
import { createAdminClient } from "@/lib/supabase/admin";

export type ResetDemoState = { status: "idle" | "done" | "error"; message?: string };

/** « Réinitialiser la démo » : réservé au commerce de démo du compte connecté. */
export async function resetDemo(): Promise<ResetDemoState> {
  const merchant = await requireMerchant();
  if (!merchant.is_demo) return { status: "error", message: "Ce commerce n'est pas un commerce de démo." };
  try {
    await regenerateDemo(createAdminClient(), merchant.id);
  } catch (error) {
    console.error("Réinitialisation de la démo impossible", error);
    return { status: "error", message: "La réinitialisation a échoué, réessayez." };
  }
  revalidatePath("/", "layout");
  return { status: "done" };
}
