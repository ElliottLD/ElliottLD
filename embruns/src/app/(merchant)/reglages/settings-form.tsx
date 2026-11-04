"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { BUSINESS_TYPES } from "@/lib/business-types";
import { BRAND_TONES } from "@/lib/settings";
import { saveSettings, type SettingsState } from "./actions";

export type MerchantSettings = {
  name: string;
  business_type: string;
  brand_color: string;
  google_review_url: string | null;
  brand_tone: string;
  stamps_required: number;
  reward_label: string;
};

const select =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-base text-ink focus:border-marine-500 focus:outline-none";

export function SettingsForm({ merchant }: { merchant: MerchantSettings }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, { status: "idle" });

  return (
    <form action={action} className="space-y-6">
      <Card>
        <h2 className="mb-4 font-semibold text-marine-900">Commerce</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" name="name" defaultValue={merchant.name} required maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="business_type">Type de commerce</Label>
            <select id="business_type" name="business_type" defaultValue={merchant.business_type} className={select}>
              {BUSINESS_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand_color">Couleur de la carte de fidélité</Label>
            <div className="flex items-center gap-3">
              <input
                id="brand_color"
                name="brand_color"
                type="color"
                defaultValue={merchant.brand_color.toLowerCase()}
                className="h-11 w-16 cursor-pointer rounded-lg border border-line bg-white p-1"
              />
              <span className="text-sm text-muted">Utilisée sur la carte et dans les emails.</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="google_review_url">Lien vers votre fiche Google</Label>
            <Input
              id="google_review_url"
              name="google_review_url"
              type="url"
              defaultValue={merchant.google_review_url ?? ""}
              placeholder="https://g.page/r/…/review"
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold text-marine-900">Programme de fidélité</h2>
        <p className="mb-4 text-sm text-muted">Un tampon par visite, au plus un toutes les 2 heures. La carte repart à zéro après la récompense.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="stamps_required">Tampons pour une récompense</Label>
            <Input id="stamps_required" name="stamps_required" type="number" min={2} max={50} defaultValue={merchant.stamps_required} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reward_label">Récompense</Label>
            <Input id="reward_label" name="reward_label" defaultValue={merchant.reward_label} required maxLength={80} />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold text-marine-900">Ton de la marque</h2>
        <p className="mb-4 text-sm text-muted">L&apos;IA rédigera vos réponses aux avis et vos campagnes dans ce ton. Tout reste modifiable avant envoi.</p>
        <fieldset className="grid gap-3 sm:grid-cols-3">
          <legend className="sr-only">Ton de la marque</legend>
          {BRAND_TONES.map((t) => (
            <label
              key={t.value}
              className="flex cursor-pointer flex-col gap-1 rounded-xl p-4 ring-1 ring-line has-[:checked]:bg-marine-50 has-[:checked]:ring-2 has-[:checked]:ring-marine-700"
            >
              <span className="flex items-center gap-2 font-medium text-ink">
                <input type="radio" name="brand_tone" value={t.value} defaultChecked={merchant.brand_tone === t.value} className="accent-marine-800" />
                {t.label}
              </span>
              <span className="text-sm italic text-muted">« {t.example} »</span>
            </label>
          ))}
        </fieldset>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {state.status === "saved" ? (
          <span className="inline-flex items-center gap-1 text-sm text-success" role="status">
            <Check className="size-4" aria-hidden="true" /> Réglages enregistrés
          </span>
        ) : null}
        {state.status === "error" ? (
          <span className="text-sm text-danger" role="alert">
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
