"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMerchant } from "@/lib/merchant";
import { normalizePhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

export type FoundCustomer = { id: string; firstName: string | null; contact: string; stamps: number };

/** Masque le contact : assez pour reconnaître le client au comptoir, pas plus. */
function maskContact(email: string | null, phone: string | null): string {
  if (phone) return `${phone.slice(0, 4)} ** ** ${phone.slice(-4, -2)} ${phone.slice(-2)}`;
  if (email) {
    const [user, domain] = email.split("@");
    return `${user.slice(0, 2)}…@${domain}`;
  }
  return "";
}

/**
 * Recherche d'un client au comptoir : jeton de carte (QR scanné), téléphone,
 * email ou prénom. RLS limite la recherche aux clients du commerçant.
 */
export async function findCustomers(query: string): Promise<FoundCustomer[]> {
  const merchant = await requireMerchant();
  const q = query.trim().slice(0, 120);
  if (q.length < 2) return [];
  const supabase = await createClient();

  let customerIds: string[] | null = null;
  const token = q.match(/[0-9a-f]{48}/i)?.[0];
  if (token) {
    const { data } = await supabase.from("loyalty_cards").select("customer_id").eq("public_token", token.toLowerCase()).limit(1);
    customerIds = (data ?? []).map((c) => c.customer_id);
  }

  let base = supabase
    .from("customers")
    .select("id, first_name, email, phone, loyalty_cards(current_stamps)")
    .eq("merchant_id", merchant.id)
    .is("anonymized_at", null)
    .limit(6);
  const phone = normalizePhone(q);
  if (customerIds) base = base.in("id", customerIds);
  else if (q.includes("@")) base = base.ilike("email", `${q.toLowerCase().replace(/[%_\\]/g, "")}%`);
  else if (phone && /\d{6,}/.test(q.replace(/\D/g, ""))) base = base.eq("phone", phone);
  else base = base.ilike("first_name", `${q.replace(/[%_\\]/g, "")}%`).order("first_name");

  const { data, error } = await base;
  if (error) throw error;
  return (data ?? []).map((c) => {
    // Relation un-à-un (customer_id unique) : PostgREST renvoie un objet, parfois un tableau.
    const card = (Array.isArray(c.loyalty_cards) ? c.loyalty_cards[0] : c.loyalty_cards) as { current_stamps: number } | null | undefined;
    return { id: c.id, firstName: c.first_name, contact: maskContact(c.email, c.phone), stamps: card?.current_stamps ?? 0 };
  });
}

export type StampResult =
  | { status: "ok"; stamps: number; stampsRequired: number; reward: boolean; matchedSale: boolean }
  | { status: "too_soon"; nextAllowedAt: string }
  | { status: "error"; message: string };

const stampSchema = z.object({
  customerId: z.uuid(),
  amount: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v.replace(",", "."))))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v < 10000), "Montant invalide."),
});

/** Ajoute un tampon (fonction SQL add_stamp : anti-abus 2 h, récompense, rattachement à la vente). */
export async function stampCustomer(customerId: string, amount: string): Promise<StampResult> {
  await requireMerchant();
  const parsed = stampSchema.safeParse({ customerId, amount });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Saisie invalide." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_stamp", {
    p_customer_id: parsed.data.customerId,
    p_amount: parsed.data.amount,
  });
  if (error) return { status: "error", message: "Tampon impossible, réessayez." };
  const r = data as Record<string, unknown>;
  revalidatePath("/clients");
  if (r.status === "too_soon") return { status: "too_soon", nextAllowedAt: String(r.next_allowed_at) };
  return {
    status: "ok",
    stamps: Number(r.stamps),
    stampsRequired: Number(r.stamps_required),
    reward: Boolean(r.reward),
    matchedSale: Boolean(r.sale_id),
  };
}
