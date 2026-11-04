"use server";

import { revalidatePath } from "next/cache";
import { requireMerchant } from "@/lib/merchant";
import { settingsSchema } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { status: "idle" | "saved" | "error"; message?: string };

export async function saveSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const merchant = await requireMerchant();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("merchants").update(parsed.data).eq("id", merchant.id);
  if (error) return { status: "error", message: "Enregistrement impossible, réessayez." };
  revalidatePath("/", "layout");
  return { status: "saved" };
}
