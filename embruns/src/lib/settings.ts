import { z } from "zod";
import { BUSINESS_TYPE_VALUES } from "@/lib/business-types";

export const BRAND_TONES = [
  { value: "warm", label: "Chaleureux", example: "Merci mille fois, à très vite pour la prochaine fournée !" },
  { value: "sober", label: "Sobre", example: "Merci pour votre visite. À bientôt." },
  { value: "playful", label: "Décalé", example: "Votre croissant vous réclame. On dit ça, on dit rien." },
] as const;

/** Réglages du commerce, validés côté serveur. */
export const settingsSchema = z.object({
  name: z.string().trim().min(1, "Indiquez le nom du commerce.").max(120),
  business_type: z.enum(BUSINESS_TYPE_VALUES),
  brand_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide."),
  google_review_url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https:\/\//.test(v), "Le lien doit commencer par https://")
    .transform((v) => (v === "" ? null : v)),
  brand_tone: z.enum(["warm", "sober", "playful"]),
  stamps_required: z.coerce.number().int().min(2, "Au moins 2 tampons.").max(50, "50 tampons maximum."),
  reward_label: z.string().trim().min(2, "Décrivez la récompense.").max(80),
});

export type SettingsInput = z.input<typeof settingsSchema>;
