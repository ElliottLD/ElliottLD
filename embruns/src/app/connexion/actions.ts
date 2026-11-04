"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/routes";

export type MagicLinkState = { status: "idle" } | { status: "sent"; email: string } | { status: "error"; message: string };

const schema = z.object({ email: z.email().trim().toLowerCase(), suite: z.string().optional() });

export async function sendMagicLink(_prev: MagicLinkState, formData: FormData): Promise<MagicLinkState> {
  const parsed = schema.safeParse({ email: formData.get("email"), suite: formData.get("suite") ?? undefined });
  if (!parsed.success) return { status: "error", message: "Adresse email invalide." };

  const { email, suite } = parsed.data;
  const redirect = new URL("/auth/confirm", publicEnv().siteUrl);
  redirect.searchParams.set("suite", safeNextPath(suite));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirect.toString(), shouldCreateUser: true },
  });
  if (error) {
    return {
      status: "error",
      message: error.status === 429 ? "Trop de demandes, réessayez dans une minute." : "Envoi impossible pour le moment, réessayez.",
    };
  }
  return { status: "sent", email };
}
