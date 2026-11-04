"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { BUSINESS_TYPES } from "@/lib/business-types";
import { createMerchant, type CreateMerchantState } from "./actions";

export function MerchantForm() {
  const [state, action, pending] = useActionState<CreateMerchantState, FormData>(createMerchant, {});
  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nom du commerce</Label>
        <Input id="name" name="name" required maxLength={120} placeholder="Au Pain Doré" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="business_type">Type de commerce</Label>
        <select
          id="business_type"
          name="business_type"
          defaultValue="bakery"
          className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-base text-ink focus:border-marine-500 focus:outline-none"
        >
          {BUSINESS_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      {state.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Création…" : "Créer mon commerce"}
      </Button>
    </form>
  );
}
